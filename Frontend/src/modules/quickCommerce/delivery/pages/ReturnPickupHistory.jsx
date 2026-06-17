import React, { useEffect, useState } from "react";
import { Loader2, Package, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const ReturnPickupHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("delivery_accessToken") || localStorage.getItem("token") || "";
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/quick-commerce/delivery/returns/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setHistory(data.history || []);
      } else {
        toast.error("Failed to load return history");
      }
    } catch (error) {
      toast.error("Error loading return history");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-emerald-600" size={24} />
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen pb-20">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Return History</h1>
        <p className="text-sm text-gray-500">Your completed return pickups</p>
      </div>

      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No return history available.</p>
          </div>
        ) : (
          history.map((item) => (
            <div key={item._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Order #{item.orderId?.slice(-6).toUpperCase()}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(item.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-600">+ ₹{item.returnPickupEarning || '20.00'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-gray-700">Completed</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReturnPickupHistory;
