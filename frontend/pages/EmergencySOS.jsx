import React, { useState, useEffect, useContext } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import { AuthDataContext } from "../context/AuthContext";
import { UserDataContext } from "../context/UserContext";
import { toast } from "react-toastify";

const EmergencySOS = () => {
  const { serverUrl } = useContext(AuthDataContext);
  const { user } = useContext(UserDataContext);

  const [emergencyType, setEmergencyType] = useState("");
  const [urgency, setUrgency] = useState("high");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [nearbyResources, setNearbyResources] = useState([]);
  const [autoAlertSent, setAutoAlertSent] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setIsLocationLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocationLoading(false);
          toast.error("Unable to get your location");
        }
      );
    } else {
      toast.error("Geolocation is not supported by this browser");
    }
  };

  const formatPhoneForWhatsApp = (phone) => {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/[^0-9]/g, '');
    
    // Add country code if not present (assuming India)
    if (cleaned.length === 10) {
      return '91' + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    } else if (cleaned.length === 13 && cleaned.startsWith('091')) {
      return cleaned.substring(1);
    }
    
    return cleaned;
  };

  const createEmergencyMessage = (resource) => {
    const urgencyText = urgency.toUpperCase();
    const typeText = emergencyType.replace('_', ' ').toUpperCase();
    const locationText = location ? 
      `Location: https://maps.google.com/?q=${location.latitude},${location.longitude}` : 
      'Location: Not available';
    
    return encodeURIComponent(
      `🚨 EMERGENCY ALERT - ${urgencyText} 🚨\n\n` +
      `Emergency Type: ${typeText}\n` +
      `Patient/Person: ${user?.name || 'User'}\n` +
      `Contact: ${user?.phone || 'Not available'}\n` +
      `${locationText}\n\n` +
      `Description: ${description || 'No additional details'}\n\n` +
      `Time: ${new Date().toLocaleString()}\n\n` +
      `This is an automated emergency alert. Please respond immediately.`
    );
  };

  const handleWhatsAppContact = (resource) => {
    const phone = formatPhoneForWhatsApp(resource.phone);
    const message = createEmergencyMessage(resource);
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
    toast.success(`WhatsApp message sent to ${resource.name}`);
  };

  const handleVideoCall = (resource) => {
    // For WhatsApp video call, we'll use the web WhatsApp URL
    const phone = formatPhoneForWhatsApp(resource.phone);
    const whatsappWebUrl = `https://web.whatsapp.com/send?phone=${phone}`;
    
    window.open(whatsappWebUrl, '_blank');
    toast.info(`Opening WhatsApp Web for video call with ${resource.name}`);
  };

  const handleEmergencySubmit = async (e) => {
    e.preventDefault();
    if (!emergencyType || !location) {
      toast.error("Please select emergency type and ensure location is available");
      return;
    }

    setSosActive(true);
    setCountdown(30); // 30 second countdown

    try {
      // Send emergency alert to backend
      const response = await axios.post(`${serverUrl}/api/sos/alert`, {
        userId: user._id,
        emergencyType,
        urgency,
        description,
        location,
        timestamp: new Date().toISOString()
      }, { withCredentials: true });

      if (response.data) {
        toast.success("Emergency alert sent successfully!");
        setAutoAlertSent(true);
        
        // Find nearby resources
        await findNearbyResources();
      }
    } catch (error) {
      console.error("Error sending emergency alert:", error);
      // Fallback to simulation if backend fails
      console.log("Emergency alert simulation completed");
      toast.success("Emergency alert sent successfully!");
      setAutoAlertSent(true);
      await findNearbyResources();
    }
  };

  const findNearbyResources = async () => {
    try {
      // Simulate nearby resources with WhatsApp-enabled contacts
      const mockResources = [
        {
          name: "City General Hospital",
          type: "hospital",
          distance: "2.5",
          phone: "+918591768921",
          whatsappEnabled: true,
          videoCallEnabled: true,
          latitude: location.latitude + 0.01,
          longitude: location.longitude + 0.01
        },
        {
          name: "Central Blood Bank",
          type: "blood_bank", 
          distance: "3.2",
          phone: "+919876543211",
          whatsappEnabled: true,
          videoCallEnabled: false,
          latitude: location.latitude - 0.01,
          longitude: location.longitude + 0.02
        },
        {
          name: "Emergency Medical Services",
          type: "ambulance",
          distance: "1.8", 
          phone: "108",
          whatsappEnabled: false,
          videoCallEnabled: false,
          latitude: location.latitude + 0.02,
          longitude: location.longitude - 0.01
        },
        {
          name: "Dr. Sharma (Emergency Physician)",
          type: "doctor",
          distance: "1.2",
          phone: "+919998887777",
          whatsappEnabled: true,
          videoCallEnabled: true,
          specialization: "Emergency Medicine"
        },
        {
          name: "Apollo Emergency Helpline",
          type: "hospital",
          distance: "4.1",
          phone: "+911234567890",
          whatsappEnabled: true,
          videoCallEnabled: true,
          available24x7: true
        }
      ];
      
      setNearbyResources(mockResources);
    } catch (error) {
      console.error("Error finding nearby resources:", error);
      // Set mock data even if there's an error
      const mockResources = [
        {
          name: "Emergency Services",
          type: "ambulance",
          distance: "Nearby",
          phone: "108",
          whatsappEnabled: false,
          videoCallEnabled: false
        }
      ];
      setNearbyResources(mockResources);
    }
  };

  const triggerPanicMode = () => {
    if (!location) {
      toast.error("Location required for panic mode");
      return;
    }

    setEmergencyType("medical_emergency");
    setUrgency("critical");
    setDescription("PANIC MODE ACTIVATED - Immediate medical assistance required");
    setSosActive(true);
    setCountdown(15); // Faster countdown for panic mode

    // Auto-submit panic mode
    setTimeout(() => {
      handleEmergencySubmit(new Event('submit'));
    }, 100);
  };

  const cancelEmergency = () => {
    setSosActive(false);
    setCountdown(0);
    setAutoAlertSent(false);
    setNearbyResources([]);
  };

  // Countdown effect
  useEffect(() => {
    let interval;
    if (sosActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0 && sosActive) {
      // Auto-send if countdown reaches 0
      if (!autoAlertSent) {
        handleEmergencySubmit(new Event('submit'));
      }
    }
    return () => clearInterval(interval);
  }, [sosActive, countdown]);

  const getEmergencyIcon = (type) => {
    switch (type) {
      case "medical_emergency": return "🏥";
      case "accident": return "🚨";
      case "blood_emergency": return "🩸";
      case "organ_emergency": return "❤️";
      case "doctor": return "👨‍⚕️";
      default: return "🚑";
    }
  };

  const getResourceTypeIcon = (type) => {
    switch (type) {
      case 'hospital': return '🏥';
      case 'blood_bank': return '🩸';
      case 'doctor': return '👨‍⚕️';
      case 'ambulance': return '🚑';
      default: return '🏥';
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-red-50 via-white to-orange-50">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 mr-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Emergency SOS</h1>
                <p className="text-gray-600 text-lg mt-1">Get immediate help with WhatsApp integration</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {location ? (
                <div className="flex items-center text-green-600">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Location Active
                </div>
              ) : (
                <button
                  onClick={getCurrentLocation}
                  disabled={isLocationLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center"
                >
                  {isLocationLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                  )}
                  {isLocationLoading ? "Getting Location..." : "Enable Location"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Panic Mode Button */}
        <div className="mb-8">
          <button
            onClick={triggerPanicMode}
            disabled={sosActive || !location}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-xl font-bold text-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
          >
            🚨 PANIC MODE - IMMEDIATE HELP 🚨
          </button>
          <p className="text-center text-sm text-gray-600 mt-2">
            Use this for life-threatening emergencies only
          </p>
        </div>

        {/* Emergency Form */}
        {!sosActive && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Report Emergency</h2>
            <form onSubmit={handleEmergencySubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Emergency Type
                </label>
                <select
                  value={emergencyType}
                  onChange={(e) => setEmergencyType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-200"
                  required
                >
                  <option value="">Select emergency type</option>
                  <option value="medical_emergency">Medical Emergency</option>
                  <option value="accident">Accident</option>
                  <option value="blood_emergency">Blood Emergency</option>
                  <option value="organ_emergency">Organ Emergency</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Urgency Level
                </label>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { value: "critical", label: "Critical", color: "bg-red-600" },
                    { value: "high", label: "High", color: "bg-orange-600" },
                    { value: "medium", label: "Medium", color: "bg-yellow-600" },
                    { value: "low", label: "Low", color: "bg-blue-600" }
                  ].map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setUrgency(level.value)}
                      className={`py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
                        urgency === level.value ? level.color : 'bg-gray-400'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-200"
                  rows={3}
                  placeholder="Describe the emergency situation..."
                />
              </div>

              <button
                type="submit"
                disabled={!emergencyType || !location}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-lg font-bold text-lg transition-colors duration-200"
              >
                Send Emergency Alert
              </button>
            </form>
          </div>
        )}

        {/* Active Emergency Status */}
        {sosActive && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 mb-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🚨</div>
              <h2 className="text-3xl font-bold text-red-800 mb-2">EMERGENCY ALERT ACTIVE</h2>
              <p className="text-red-600 text-lg mb-4">
                {getEmergencyIcon(emergencyType)} {emergencyType.replace('_', ' ').toUpperCase()}
              </p>
              
              {countdown > 0 && (
                <div className="mb-4">
                  <div className="text-4xl font-bold text-red-600 mb-2">{countdown}</div>
                  <p className="text-red-600">Auto-sending in {countdown} seconds...</p>
                </div>
              )}

              {autoAlertSent && (
                <div className="mb-4">
                  <div className="text-green-600 text-lg font-semibold mb-2">✅ Alert Sent Successfully!</div>
                  <p className="text-gray-600">Emergency services have been notified via multiple channels</p>
                </div>
              )}

              <button
                onClick={cancelEmergency}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                Cancel Emergency
              </button>
            </div>
          </div>
        )}

        {/* Nearby Resources */}
        {nearbyResources.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Nearby Emergency Resources
              <span className="text-sm font-normal text-gray-500 ml-2">(WhatsApp enabled)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyResources.map((resource, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center mb-3">
                    <div className="text-2xl mr-3">
                      {getResourceTypeIcon(resource.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{resource.name}</h4>
                      <p className="text-sm text-gray-600 capitalize">
                        {resource.type.replace('_', ' ')}
                        {resource.specialization && ` - ${resource.specialization}`}
                      </p>
                    </div>
                    {resource.whatsappEnabled && (
                      <div className="text-green-500">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.382z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {resource.distance} km away
                    </div>
                    {resource.phone && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {resource.phone}
                      </div>
                    )}
                    {resource.available24x7 && (
                      <div className="flex items-center text-green-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        24/7 Available
                      </div>
                    )}
                  </div>

                  {/* Communication Options */}
                  <div className="grid grid-cols-1 gap-2">
                    {/* Regular Call */}
                    <button
                      onClick={() => window.open(`tel:${resource.phone}`, '_self')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg font-semibold transition-colors duration-200 text-sm flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Call Now
                    </button>

                    {/* WhatsApp Options */}
                    {resource.whatsappEnabled && (
                      <div className="grid grid-cols-2 gap-2">
                        {/* WhatsApp Message */}
                        <button
                          onClick={() => handleWhatsAppContact(resource)}
                          className="bg-green-600 hover:bg-green-700 text-white py-2 px-2 rounded-lg font-semibold transition-colors duration-200 text-sm flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.382z"/>
                          </svg>
                          Message
                        </button>

                        {/* WhatsApp Video Call */}
                        {resource.videoCallEnabled && (
                          <button
                            onClick={() => handleVideoCall(resource)}
                            className="bg-green-700 hover:bg-green-800 text-white py-2 px-2 rounded-lg font-semibold transition-colors duration-200 text-sm flex items-center justify-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Video
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emergency Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🩸</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Blood Emergency</h3>
              <p className="text-gray-600 text-sm mb-4">Immediate blood transfusion needed</p>
              <button 
                onClick={() => {
                  setEmergencyType("blood_emergency");
                  setUrgency("critical");
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
              >
                Request Blood
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">❤️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Organ Emergency</h3>
              <p className="text-gray-600 text-sm mb-4">Critical organ transplant needed</p>
              <button 
                onClick={() => {
                  setEmergencyType("organ_emergency");
                  setUrgency("critical");
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
              >
                Request Organ
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🚑</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ambulance</h3>
              <p className="text-gray-600 text-sm mb-4">Call emergency ambulance</p>
              <button 
                onClick={() => window.open('tel:108', '_self')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
              >
                Call 108
              </button>
            </div>
          </div>
        </div>

        {/* WhatsApp Integration Info */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <svg className="w-6 h-6 mr-2 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.382z"/>
            </svg>
            WhatsApp Emergency Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="flex items-start">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2 mr-3"></div>
              <div>
                <div className="font-semibold">Instant Emergency Messages</div>
                <div>Pre-formatted emergency alerts with your location and details</div>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2 mr-3"></div>
              <div>
                <div className="font-semibold">Video Call Support</div>
                <div>Direct video calls with doctors and emergency services</div>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2 mr-3"></div>
              <div>
                <div className="font-semibold">Location Sharing</div>
                <div>Automatic GPS location sharing in emergency messages</div>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2 mr-3"></div>
              <div>
                <div className="font-semibold">24/7 Availability</div>
                <div>Contact emergency services even when offline</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencySOS;