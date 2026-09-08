"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default marker icons in Next.js
const customIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface MapPickerProps {
    latitude: number;
    longitude: number;
    radius: number;
    onSelectLocation: (lat: number, lng: number) => void;
}

// Component to handle map clicks
function MapClickHandler({ onSelectLocation }: { onSelectLocation: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onSelectLocation(
                Number(e.latlng.lat.toFixed(6)),
                Number(e.latlng.lng.toFixed(6))
            );
        },
    });
    return null;
}

// Component to re-center map when lat/lng state changes
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.setView([lat, lng], map.getZoom());
        }
    }, [lat, lng, map]);
    return null;
}

export default function MapPicker({ latitude, longitude, radius, onSelectLocation }: MapPickerProps) {
    return (
        <MapContainer
            center={[latitude, longitude]}
            zoom={16}
            scrollWheelZoom={true}
            style={{ width: "100%", height: "100%", borderRadius: "0.5rem" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onSelectLocation={onSelectLocation} />
            <MapRecenter lat={latitude} lng={longitude} />
            
            {/* Center Marker */}
            <Marker position={[latitude, longitude]} icon={customIcon} />

            {/* Allowed Radius Circle */}
            <Circle
                center={[latitude, longitude]}
                radius={radius}
                pathOptions={{
                    color: "#2563eb",
                    fillColor: "#3b82f6",
                    fillOpacity: 0.25,
                    weight: 2,
                }}
            />
        </MapContainer>
    );
}
