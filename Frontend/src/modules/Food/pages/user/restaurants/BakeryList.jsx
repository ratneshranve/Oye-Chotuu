import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Clock, MapPin, Heart, Star } from "lucide-react"
import AnimatedPage from "@food/components/user/AnimatedPage"
import Footer from "@food/components/user/Footer"
import ScrollReveal from "@food/components/user/ScrollReveal"
import TextReveal from "@food/components/user/TextReveal"
import { Card, CardTitle, CardContent } from "@food/components/ui/card"
import { Button } from "@food/components/ui/button"
import { RestaurantGridSkeleton } from "@food/components/ui/loading-skeletons"
import { useProfile } from "@food/context/ProfileContext"
import { useZone } from "@food/hooks/useZone"
import { useLocation } from "@food/hooks/useLocation"
import { restaurantAPI } from "@food/api"
import { API_BASE_URL } from "@food/api/config"
import { useDelayedLoading } from "@food/hooks/useDelayedLoading"

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "")

const normalizeImageUrl = (imageUrl) => {
  if (typeof imageUrl !== "string" || !imageUrl.trim()) return ""
  const trimmed = imageUrl.trim()
  if (/^(https?:)?\/\//i.test(trimmed) || /^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) {
    return trimmed
  }
  return trimmed.startsWith("/")
    ? `${BACKEND_ORIGIN}${trimmed}`
    : `${BACKEND_ORIGIN}/${trimmed}`
}

const pickRestaurantImage = (restaurant) => {
  const candidates = [
    restaurant?.coverImage?.url,
    restaurant?.coverImage,
    ...(Array.isArray(restaurant?.coverImages) ? restaurant.coverImages.map((img) => img?.url || img) : []),
    ...(Array.isArray(restaurant?.menuImages) ? restaurant.menuImages.map((img) => img?.url || img) : []),
    restaurant?.profileImage?.url,
    restaurant?.profileImage,
  ]
  const firstValid = candidates.find((value) => typeof value === "string" && value.trim())
  return normalizeImageUrl(firstValid || "")
}

export default function BakeryList() {
  const { addFavorite, removeFavorite, isFavorite } = useProfile()
  const { location: userLocation } = useLocation()
  const { zoneId } = useZone(userLocation)
  const [bakeries, setBakeries] = useState([])
  const [loading, setLoading] = useState(true)
  const showSkeleton = useDelayedLoading(loading)

  useEffect(() => {
    let cancelled = false

    const fetchBakeries = async () => {
      try {
        setLoading(true)
        const params = { limit: 300, businessType: "home_bakery", _ts: Date.now() }
        if (zoneId) {
          params.zoneId = zoneId
        }
        const response = await restaurantAPI.getRestaurants(params, { noCache: true })
        const list =
          response?.data?.data?.restaurants ||
          response?.data?.restaurants ||
          []
        if (cancelled) return

        const transformed = list.map((bakery) => {
          const slug =
            bakery?.slug ||
            String(bakery?.name || "")
              .toLowerCase()
              .trim()
              .replace(/\s+/g, "-")
          const cuisine = Array.isArray(bakery?.cuisines) && bakery.cuisines.length > 0
            ? bakery.cuisines[0]
            : "Bakery & Desserts"
          return {
            id: bakery?._id || bakery?.restaurantId || slug,
            slug,
            name: bakery?.name || "Unknown Bakery",
            cuisine,
            rating: Number(bakery?.rating || 0) || 4.5,
            deliveryTime: bakery?.estimatedDeliveryTime || (bakery?.estimatedDeliveryTimeMinutes ? `${bakery.estimatedDeliveryTimeMinutes} mins` : "30-40 mins"),
            distance: bakery?.distance ? (typeof bakery.distance === 'number' ? `${bakery.distance.toFixed(1)} km` : bakery.distance) : "1.5 km",
            priceRange: bakery?.priceRange || "$$",
            image: pickRestaurantImage(bakery),
          }
        })

        setBakeries(transformed)
      } catch (error) {
        if (!cancelled) {
          setBakeries([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchBakeries()
    return () => {
      cancelled = true
    }
  }, [zoneId])

  const hasBakeries = useMemo(() => bakeries.length > 0, [bakeries.length])

  return (
    <AnimatedPage className="min-h-screen bg-gradient-to-b from-pink-50/20 dark:from-[#0a0a0a] via-white dark:via-[#0a0a0a] to-amber-50/10 dark:to-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 md:py-8 lg:py-10 space-y-4 sm:space-y-6 lg:space-y-8">
        <ScrollReveal>
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 mb-4 lg:mb-6">
            <Link to="/food/user">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-gray-900 dark:text-gray-100" />
              </Button>
            </Link>
            <TextReveal className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 dark:text-white">
                Home Bakeries
              </h1>
            </TextReveal>
          </div>
        </ScrollReveal>

        {showSkeleton ? (
          <RestaurantGridSkeleton count={4} />
        ) : !hasBakeries ? (
          <div className="py-16 text-center text-sm text-gray-500">No bakeries available in your zone right now.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 pt-2 sm:pt-3 lg:pt-4">
            {bakeries.map((bakery, index) => {
              const favorite = isFavorite(bakery.slug)

              const handleToggleFavorite = (e) => {
                e.preventDefault()
                e.stopPropagation()
                if (favorite) {
                  removeFavorite(bakery.slug)
                } else {
                  addFavorite({
                    slug: bakery.slug,
                    name: bakery.name,
                    cuisine: bakery.cuisine,
                    rating: bakery.rating,
                    deliveryTime: bakery.deliveryTime,
                    distance: bakery.distance,
                    priceRange: bakery.priceRange,
                    image: bakery.image,
                  })
                }
              }

              return (
                <ScrollReveal key={bakery.id} delay={index * 0.05}>
                  <Link to={`/user/restaurants/${bakery.slug}`} className="h-full flex">
                    <Card className="overflow-hidden cursor-pointer border border-gray-200 dark:border-gray-800 group bg-white dark:bg-[#1a1a1a] hover:shadow-lg dark:hover:shadow-xl dark:hover:shadow-gray-900/50 pb-1 sm:pb-2 lg:pb-3 flex flex-col h-full w-full transition-all duration-300">
                      <div className="flex flex-row min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px] flex-1">
                        <CardContent className="flex-1 flex flex-col justify-between p-3 sm:p-4 md:p-5 lg:p-6 min-w-0 overflow-hidden">
                          <div className="flex-1 flex flex-col justify-between gap-2">
                            <div className="flex-shrink-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0 pr-2">
                                  <CardTitle className="text-base sm:text-lg md:text-xl mb-1 line-clamp-2 text-gray-900 dark:text-white">
                                    {bakery.name}
                                  </CardTitle>
                                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium mb-2 line-clamp-1">
                                    {bakery.cuisine}
                                  </p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded-full">
                                      <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-yellow-400 text-yellow-400" />
                                      <span className="font-bold text-xs sm:text-sm text-yellow-700 dark:text-yellow-400">{bakery.rating.toFixed(1)}</span>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${favorite ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"}`}
                                  onClick={handleToggleFavorite}
                                >
                                  <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${favorite ? "fill-red-500 dark:fill-red-400" : ""}`} />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                                  <span className="font-medium whitespace-nowrap">{bakery.deliveryTime}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                                  <span className="font-medium whitespace-nowrap">{bakery.distance}</span>
                                </div>
                              </div>
                              <Button className="bg-pink-600 hover:bg-pink-700 text-white text-xs sm:text-sm h-7 sm:h-8 px-3 sm:px-4 flex-shrink-0 transition-colors rounded-full">
                                Visit Bakery
                              </Button>
                            </div>
                          </div>
                        </CardContent>

                        <div className="w-36 sm:w-44 md:w-56 lg:w-64 xl:w-72 flex-shrink-0 relative overflow-hidden group/image">
                          <img
                            src={bakery.image || "https://via.placeholder.com/400x300?text=Bakery"}
                            alt={bakery.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-l from-black/20 dark:from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                </ScrollReveal>
              )
            })}
          </div>
        )}
      </div>
      <Footer />
    </AnimatedPage>
  )
}
