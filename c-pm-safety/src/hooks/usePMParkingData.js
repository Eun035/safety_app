import { useState } from 'react';
import pmParkingData from '../data/pm_parking_data.json';

const usePMParkingData = () => {
    const [parkingData] = useState(pmParkingData);

    return parkingData;
};

export default usePMParkingData;
