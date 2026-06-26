import React, { useState, useEffect, useRef } from "react";
import { Wallet, Search, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { adminAPI } from "@/services/api";
import { toast } from "react-hot-toast";

export default function WalletManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchTerm || searchTerm.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await adminAPI.searchUsers(searchTerm);
        if (res?.data?.success) {
          setSearchResults(res.data.data || []);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleAddMoney = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      toast.error("Please select a user first");
      return;
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adminAPI.addMoneyToUserWallet(selectedUser._id, Number(amount));
      if (res?.data?.success) {
        toast.success(`₹${amount} added successfully to ${selectedUser.name || 'User'}'s wallet`);
        setAmount("");
        setSelectedUser(null);
      } else {
        toast.error(res?.data?.message || "Failed to add money");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add money");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-emerald-600" />
          User Wallet Management
        </h1>
        <p className="text-gray-500 mt-1">Add money to a specific user's wallet</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            Find User
          </h2>
          
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-gray-400 absolute left-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone or email..."
              className="w-full px-4 py-3 pl-11 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
            
            {isSearching && (
              <div className="absolute right-4">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              </div>
            )}

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-10">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.name || 'Unknown User'}</div>
                      <div className="text-sm text-gray-500 flex gap-2">
                        <span>{user.phone}</span>
                        {user.email && <span className="text-gray-300">•</span>}
                        {user.email && <span>{user.email}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {searchTerm.length >= 3 && !isSearching && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 p-4 text-center text-gray-500 z-10">
                No users found
              </div>
            )}
          </div>
        </div>

        {/* Add Money Form */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-opacity duration-300 ${!selectedUser ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-gray-400" />
            Add Funds
          </h2>

          {selectedUser ? (
            <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <div className="font-medium text-emerald-900">Selected User</div>
                <div className="text-sm text-emerald-700 mt-1">
                  {selectedUser.name && <span className="font-semibold">{selectedUser.name}</span>}
                  {selectedUser.name && " • "}
                  {selectedUser.phone}
                </div>
                <div className="text-sm text-emerald-700 mt-1">
                  Current Balance: ₹{selectedUser.walletBalance || 0}
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedUser(null)}
                className="ml-auto text-emerald-600 hover:text-emerald-800 text-sm font-medium px-2 py-1"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100 text-gray-500 text-sm text-center">
              Please search and select a user first
            </div>
          )}

          <form onSubmit={handleAddMoney}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Add (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-gray-500 font-medium">₹</span>
                <input
                  type="number"
                  min="1"
                  max="50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-lg"
                  disabled={!selectedUser || isSubmitting}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedUser || isSubmitting || !amount}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  Add ₹{amount || '0'} to Wallet
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
