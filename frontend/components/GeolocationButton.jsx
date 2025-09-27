import React, { useState } from "react";

const GeolocationButton = ({ onLocation }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    setLoading(true);
    setError(null);
    setLocation(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(coords);
        setLoading(false);
        if (onLocation) onLocation(coords);
      },
      (error) => {
        setError("Unable to fetch location.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={getCurrentLocation}
        disabled={loading}
        className="py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
      >
        {loading ? 'Getting Location...' : 'Get My Current Location'}
      </button>
      {error && <div className="mt-2 text-red-600">{error}</div>}
      {location && (
        <div className="mt-2 text-green-700 text-sm">
          Latitude: {location.latitude.toFixed(6)}, Longitude: {location.longitude.toFixed(6)}
        </div>
      )}
    </div>
  );
};

export default GeolocationButton;