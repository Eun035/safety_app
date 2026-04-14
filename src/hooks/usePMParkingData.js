import { useState, useEffect } from 'react';
import pmParkingData from '../data/pm_parking_data.json';

const usePMParkingData = () => {
    const [parkingData, setParkingData] = useState([]);

    useEffect(() => {
        // We import it directly, so it's readily available
        setParkingData(pmParkingData);
    }, []);

    return parkingData;
};

export default usePMParkingData;
