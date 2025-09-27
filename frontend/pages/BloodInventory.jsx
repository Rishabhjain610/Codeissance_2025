import React, { useState, useEffect, useContext } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import { AuthDataContext } from "../context/AuthContext";
import { UserDataContext } from "../context/UserContext";
import { toast } from "react-toastify";

const BloodInventory = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { user } = useContext(UserDataContext);

  const [bloodStock, setBloodStock] = useState({
    "A+": 0, "A-": 0, "B+": 0, "B-": 0,
    "AB+": 0, "AB-": 0, "O+": 0, "O-": 0
  });
  const [loading, setLoading] = useState(true);
  const [editingStock, setEditingStock] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addUnits, setAddUnits] = useState({ bloodType: "A+", units: 1 });

  // Maximum capacity for each blood type (can be adjusted)
  const MAX_CAPACITY = 50;

  useEffect(() => {
    fetchBloodStock();
  }, []);

  const fetchBloodStock = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${serverUrl}/api/bloodbank/profile`, 
        { withCredentials: true });
      
      console.log("Blood bank profile response:", response.data);
      
      // The response structure is { bloodBank: { ... } }
      if (response.data && response.data.bloodBank) {
        const bloodBank = response.data.bloodBank;
        const backendStock = bloodBank.bloodStock || {};
        
        console.log("Backend stock:", backendStock);
        
        // Ensure all blood types are present, default to 0 if not in backend
        const completeStock = {
          "A+": backendStock["A+"] || 0,
          "A-": backendStock["A-"] || 0,
          "B+": backendStock["B+"] || 0,
          "B-": backendStock["B-"] || 0,
          "AB+": backendStock["AB+"] || 0,
          "AB-": backendStock["AB-"] || 0,
          "O+": backendStock["O+"] || 0,
          "O-": backendStock["O-"] || 0
        };
        
        console.log("Complete stock data:", completeStock);
        setBloodStock(completeStock);
      } else {
        console.error("Invalid response structure:", response.data);
        toast.error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error fetching blood stock:", error);
      const errorMessage = error.response?.data?.message || "Failed to load blood inventory";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (bloodType, newQuantity) => {
    try {
      const updatedStock = { ...bloodStock, [bloodType]: parseInt(newQuantity) };
      
      const response = await axios.put(`${serverUrl}/api/bloodbank/stock`, {
        bloodStock: updatedStock
      }, { withCredentials: true });

      console.log("Update stock response:", response.data); // Debug log

      if (response.data && response.data.success) {
        setBloodStock(updatedStock);
        setEditingStock({});
        toast.success(`${bloodType} stock updated successfully`);
      } else {
        throw new Error(response.data?.message || "Update failed");
      }
    } catch (error) {
      console.error("Error updating stock:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update stock";
      toast.error(errorMessage);
    }
  };

  const addUnitsToStock = async () => {
    try {
      const response = await axios.put(`${serverUrl}/api/bloodbank/stock/increment`, {
        bloodType: addUnits.bloodType,
        units: parseInt(addUnits.units)
      }, { withCredentials: true });

      console.log("Add units response:", response.data); // Debug log

      if (response.data && response.data.success) {
        // Update local state with the response bloodStock or manually calculate
        const newStock = response.data.bloodStock || {
          ...bloodStock,
          [addUnits.bloodType]: (bloodStock[addUnits.bloodType] || 0) + parseInt(addUnits.units)
        };
        
        // Ensure all blood types are present
        const completeStock = {
          "A+": newStock["A+"] || 0,
          "A-": newStock["A-"] || 0,
          "B+": newStock["B+"] || 0,
          "B-": newStock["B-"] || 0,
          "AB+": newStock["AB+"] || 0,
          "AB-": newStock["AB-"] || 0,
          "O+": newStock["O+"] || 0,
          "O-": newStock["O-"] || 0
        };
        
        setBloodStock(completeStock);
        setShowAddForm(false);
        setAddUnits({ bloodType: "A+", units: 1 });
        toast.success(`${addUnits.units} units of ${addUnits.bloodType} added to inventory`);
      } else {
        throw new Error(response.data?.message || "Failed to add units");
      }
    } catch (error) {
      console.error("Error adding units:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to add units";
      toast.error(errorMessage);
    }
  };

  const getBloodTypeInfo = (bloodType) => {
    const colors = {
      "A+": { bg: "bg-blue-500", light: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
      "A-": { bg: "bg-blue-700", light: "bg-blue-50", text: "text-blue-800", border: "border-blue-300" },
      "B+": { bg: "bg-purple-500", light: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
      "B-": { bg: "bg-purple-700", light: "bg-purple-50", text: "text-purple-800", border: "border-purple-300" },
      "AB+": { bg: "bg-green-500", light: "bg-green-100", text: "text-green-700", border: "border-green-200" },
      "AB-": { bg: "bg-green-700", light: "bg-green-50", text: "text-green-800", border: "border-green-300" },
      "O+": { bg: "bg-red-500", light: "bg-red-100", text: "text-red-700", border: "border-red-200" },
      "O-": { bg: "bg-red-700", light: "bg-red-50", text: "text-red-800", border: "border-red-300" }
    };
    return colors[bloodType] || colors["A+"];
  };

  const getStockStatus = (current, max = MAX_CAPACITY) => {
    const percentage = (current / max) * 100;
    if (percentage === 0) return { status: "Empty", color: "text-red-600", bgColor: "bg-red-500" };
    if (percentage < 20) return { status: "Critical", color: "text-red-600", bgColor: "bg-red-500" };
    if (percentage < 40) return { status: "Low", color: "text-yellow-600", bgColor: "bg-yellow-500" };
    if (percentage < 70) return { status: "Medium", color: "text-blue-600", bgColor: "bg-blue-500" };
    if (percentage < 90) return { status: "Good", color: "text-green-600", bgColor: "bg-green-500" };
    return { status: "Full", color: "text-green-700", bgColor: "bg-green-600" };
  };

  const calculateTotalUnits = () => {
    return Object.values(bloodStock).reduce((total, units) => total + units, 0);
  };

  const calculateCriticalTypes = () => {
    return Object.entries(bloodStock).filter(([type, units]) => {
      const percentage = (units / MAX_CAPACITY) * 100;
      return percentage < 20;
    }).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-red-50 via-white to-pink-50">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading blood inventory...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-red-50 via-white to-pink-50">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 mr-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Blood Inventory</h1>
                <p className="text-gray-600 text-lg mt-1">Monitor and manage blood stock levels</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchBloodStock}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Stock
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Units</p>
                <p className="text-2xl font-bold text-gray-900">{calculateTotalUnits()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Max Capacity</p>
                <p className="text-2xl font-bold text-gray-900">{MAX_CAPACITY * 8}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Critical Types</p>
                <p className="text-2xl font-bold text-red-600">{calculateCriticalTypes()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Blood Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Object.entries(bloodStock).map(([bloodType, currentUnits]) => {
            const typeInfo = getBloodTypeInfo(bloodType);
            const stockStatus = getStockStatus(currentUnits);
            const percentage = Math.min((currentUnits / MAX_CAPACITY) * 100, 100);
            
            return (
              <div key={bloodType} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className={`${typeInfo.light} px-6 py-4 border-b ${typeInfo.border}`}>
                  <div className="flex items-center justify-between">
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${typeInfo.text} ${typeInfo.light} border ${typeInfo.border}`}>
                      {bloodType}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color} bg-opacity-10`}>
                      {stockStatus.status}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{currentUnits}</div>
                      <div className="text-sm text-gray-500">units available</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-700">{percentage.toFixed(0)}%</div>
                      <div className="text-sm text-gray-500">capacity</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>0</span>
                      <span>{MAX_CAPACITY} max</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${stockStatus.bgColor}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Edit Stock */}
                  <div className="flex items-center space-x-2">
                    {editingStock[bloodType] ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          max={MAX_CAPACITY}
                          defaultValue={currentUnits}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateStock(bloodType, e.target.value);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            const input = e.target.parentElement.querySelector('input');
                            updateStock(bloodType, input.value);
                          }}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingStock({})}
                          className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditingStock({ [bloodType]: true })}
                        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        Edit Stock
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Stock Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Add Blood Units</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blood Type
                  </label>
                  <select
                    value={addUnits.bloodType}
                    onChange={(e) => setAddUnits({ ...addUnits, bloodType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    {Object.keys(bloodStock).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Units to Add
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={addUnits.units}
                    onChange={(e) => setAddUnits({ ...addUnits, units: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-blue-900">
                        Current {addUnits.bloodType} stock: <strong>{bloodStock[addUnits.bloodType]} units</strong>
                      </p>
                      <p className="text-sm text-blue-700">
                        After adding: <strong>{bloodStock[addUnits.bloodType] + parseInt(addUnits.units || 0)} units</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addUnitsToStock}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors duration-200"
                  >
                    Add Units
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Low Stock Alert */}
        {calculateCriticalTypes() > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Low Stock Alert
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    {calculateCriticalTypes()} blood type(s) are running critically low (below 20% capacity).
                    Consider organizing donation drives or contacting donors.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BloodInventory;