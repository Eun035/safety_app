import React from 'react';
import { MapMarker } from 'react-kakao-maps-sdk';

const SafetyMarker = ({ place, onClick }) => {
    const getMarkerImage = () => {
        switch (place.type) {
            case 'SLOPE':
                return {
                    src: 'https://cdn-icons-png.flaticon.com/512/595/595067.png', // Warning icon
                    size: { width: 40, height: 40 },
                };
            case 'SCHOOL':
                return {
                    src: 'https://cdn-icons-png.flaticon.com/512/3209/3209087.png', // School icon
                    size: { width: 40, height: 40 },
                };
            case 'PARKING':
                return {
                    src: 'https://cdn-icons-png.flaticon.com/512/2991/2991231.png', // Parking icon
                    size: { width: 40, height: 40 },
                };
            default:
                return {
                    src: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                    size: { width: 30, height: 35 },
                };
        }
    };

    return (
        <MapMarker
            position={{ lat: place.lat, lng: place.lng }}
            onClick={onClick}
            image={getMarkerImage()}
            title={place.title}
        />
    );
};

export default SafetyMarker;
