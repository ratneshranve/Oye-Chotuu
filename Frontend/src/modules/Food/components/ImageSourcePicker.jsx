import { Camera, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@food/components/ui/dialog"
import { isFlutterBridgeAvailable, openCamera, openGallery } from "@food/utils/imageUploadUtils"

/**
 * ImageSourcePicker component to choose between Camera and Gallery
 * This shows a dialog in-app and handles the selection
 */
export const ImageSourcePicker = ({ 
  isOpen, 
  onClose, 
  onFileSelect, 
  title = "Update photo",
  description = "Choose how you want to upload your photo.",
  fileNamePrefix = "upload",
  galleryInputRef = null
}) => {
  
  const handleOpenCamera = async () => {
    const openPromise = openCamera({
      onSelectFile: onFileSelect,
      fileNamePrefix: fileNamePrefix
    })
    onClose()
    await openPromise
  }

  const handlePickFromDevice = async () => {
    onClose()
    
    // 1. Try Bridge first
    if (isFlutterBridgeAvailable()) {
      await openGallery({
        onSelectFile: onFileSelect,
        fileNamePrefix: fileNamePrefix
      })
      return
    }

    // 2. Try provided ref (Standard browser behavior)
    if (galleryInputRef && galleryInputRef.current) {
      galleryInputRef.current.click()
    } else {
      // 3. Last resort - generic browser input
      const input = document.createElement("input")
      input.type = "file"
      input.accept = "image/*"
      input.onchange = (e) => {
        const file = e.target.files?.[0]
        if (file) onFileSelect(file)
      }
      input.click()
    }
  }

  // If no bridge is available, we might not even need the dialog if we want to default to gallery
  // But usually users might still want a camera option if their browser supports it.

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-[calc(100%-2rem)] rounded-2xl p-0 overflow-hidden bg-white dark:bg-[#1a1a1a] border dark:border-gray-800">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">{title}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 px-5 pb-5">
          <button
            type="button"
            onClick={handleOpenCamera}
            className="w-full p-3 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-[#2a2a2a] hover:border-gray-300 dark:hover:border-gray-700 transition-all flex items-center justify-between group active:scale-[0.98]"
          >
            <span className="font-medium text-sm text-gray-900 dark:text-white">Use Camera</span>
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-colors">
              <Camera className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </button>
          <button
            type="button"
            onClick={handlePickFromDevice}
            className="w-full p-3 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-[#2a2a2a] hover:border-gray-300 dark:hover:border-gray-700 transition-all flex items-center justify-between group active:scale-[0.98]"
          >
            <span className="font-medium text-sm text-gray-900 dark:text-white">Upload from Device</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
              <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
