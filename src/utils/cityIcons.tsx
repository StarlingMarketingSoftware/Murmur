import { AlabamaIcon, ALABAMA_BACKGROUND } from '@/components/atoms/_svg/AlabamaIcon';
import { AlaskaIcon, ALASKA_BACKGROUND } from '@/components/atoms/_svg/AlaskaIcon';
import { ArizonaIcon, ARIZONA_BACKGROUND } from '@/components/atoms/_svg/ArizonaIcon';
import { ArkansasIcon, ARKANSAS_BACKGROUND } from '@/components/atoms/_svg/ArkansasIcon';
import {
	CaliforniaIcon,
	CALIFORNIA_BACKGROUND,
} from '@/components/atoms/_svg/CaliforniaIcon';
import { ColoradoIcon, COLORADO_BACKGROUND } from '@/components/atoms/_svg/ColoradoIcon';
import {
	ConnecticutIcon,
	CONNECTICUT_BACKGROUND,
} from '@/components/atoms/_svg/ConnecticutIcon';
import { DelawareIcon, DELAWARE_BACKGROUND } from '@/components/atoms/_svg/DelawareIcon';
import { FloridaIcon, FLORIDA_BACKGROUND } from '@/components/atoms/_svg/FloridaIcon';
import { GeorgiaIcon, GEORGIA_BACKGROUND } from '@/components/atoms/_svg/GeorgiaIcon';
import { HawaiiIcon, HAWAII_BACKGROUND } from '@/components/atoms/_svg/HawaiiIcon';
import { CityIcon } from '@/components/atoms/_svg/CityIcon';
import { SuburbsIcon } from '@/components/atoms/_svg/SuburbsIcon';
import { CITY_LOCATIONS_SET } from '@/constants/cityLocations';

export const getCityIconProps = (city: string, state: string) => {
	const normalizedCity = city.trim().toLowerCase();
	const normalizedState = state.trim().toLowerCase();
	const locationKey = `${city.trim()}, ${state.trim()}`.toLowerCase();
	const isCity = CITY_LOCATIONS_SET.has(locationKey);

	// If it's a recognized city, always use the CityIcon
	if (isCity) {
		return {
			icon: <CityIcon />,
			backgroundColor: '#9F9FEE',
		};
	}

	// State-only selection (no city specified) - use state-specific icons
	const isStateOnly = !normalizedCity || normalizedCity === normalizedState;

	if (isStateOnly) {
		// Check for Alabama
		if (normalizedState === 'alabama' || normalizedState === 'al') {
			return {
				icon: <AlabamaIcon />,
				backgroundColor: ALABAMA_BACKGROUND,
			};
		}

		// Check for Alaska
		if (normalizedState === 'alaska' || normalizedState === 'ak') {
			return {
				icon: <AlaskaIcon />,
				backgroundColor: ALASKA_BACKGROUND,
			};
		}

		// Check for Arizona
		if (normalizedState === 'arizona' || normalizedState === 'az') {
			return {
				icon: <ArizonaIcon />,
				backgroundColor: ARIZONA_BACKGROUND,
			};
		}

		// Check for Arkansas
		if (normalizedState === 'arkansas' || normalizedState === 'ar') {
			return {
				icon: <ArkansasIcon />,
				backgroundColor: ARKANSAS_BACKGROUND,
			};
		}

		// Check for California
		if (normalizedState === 'california' || normalizedState === 'ca') {
			return {
				icon: <CaliforniaIcon />,
				backgroundColor: CALIFORNIA_BACKGROUND,
			};
		}

		// Check for Colorado
		if (normalizedState === 'colorado' || normalizedState === 'co') {
			return {
				icon: <ColoradoIcon />,
				backgroundColor: COLORADO_BACKGROUND,
			};
		}

		// Check for Connecticut
		if (normalizedState === 'connecticut' || normalizedState === 'ct') {
			return {
				icon: <ConnecticutIcon />,
				backgroundColor: CONNECTICUT_BACKGROUND,
			};
		}

		// Check for Delaware
		if (normalizedState === 'delaware' || normalizedState === 'de') {
			return {
				icon: <DelawareIcon />,
				backgroundColor: DELAWARE_BACKGROUND,
			};
		}

		// Check for Florida
		if (normalizedState === 'florida' || normalizedState === 'fl') {
			return {
				icon: <FloridaIcon />,
				backgroundColor: FLORIDA_BACKGROUND,
			};
		}

		// Check for Georgia
		if (normalizedState === 'georgia' || normalizedState === 'ga') {
			return {
				icon: <GeorgiaIcon />,
				backgroundColor: GEORGIA_BACKGROUND,
			};
		}

		// Check for Hawaii
		if (normalizedState === 'hawaii' || normalizedState === 'hi') {
			return {
				icon: <HawaiiIcon />,
				backgroundColor: HAWAII_BACKGROUND,
			};
		}
	}

	// Default: non-city locations use SuburbsIcon
	return {
		icon: <SuburbsIcon />,
		backgroundColor: '#9DCBFF',
	};
};
