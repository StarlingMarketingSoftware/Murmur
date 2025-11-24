import { CityIcon } from '@/components/atoms/_svg/CityIcon';
import { SuburbsIcon } from '@/components/atoms/_svg/SuburbsIcon';
import { CITY_LOCATIONS_SET } from '@/constants/cityLocations';

export const getCityIconProps = (city: string, state: string) => {
	const locationKey = `${city.trim()}, ${state.trim()}`.toLowerCase();
	const isCity = CITY_LOCATIONS_SET.has(locationKey);

	return {
		icon: isCity ? <CityIcon /> : <SuburbsIcon />,
		backgroundColor: isCity ? '#9F9FEE' : '#9DCBFF',
	};
};
