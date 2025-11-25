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
import { IdahoIcon, IDAHO_BACKGROUND } from '@/components/atoms/_svg/IdahoIcon';
import { IllinoisIcon, ILLINOIS_BACKGROUND } from '@/components/atoms/_svg/IllinoisIcon';
import { IndianaIcon, INDIANA_BACKGROUND } from '@/components/atoms/_svg/IndianaIcon';
import { IowaIcon, IOWA_BACKGROUND } from '@/components/atoms/_svg/IowaIcon';
import { KansasIcon, KANSAS_BACKGROUND } from '@/components/atoms/_svg/KansasIcon';
import { KentuckyIcon, KENTUCKY_BACKGROUND } from '@/components/atoms/_svg/KentuckyIcon';
import {
	LouisianaIcon,
	LOUISIANA_BACKGROUND,
} from '@/components/atoms/_svg/LouisianaIcon';
import { MaineIcon, MAINE_BACKGROUND } from '@/components/atoms/_svg/MaineIcon';
import { MarylandIcon, MARYLAND_BACKGROUND } from '@/components/atoms/_svg/MarylandIcon';
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

		// Check for Idaho
		if (normalizedState === 'idaho' || normalizedState === 'id') {
			return {
				icon: <IdahoIcon />,
				backgroundColor: IDAHO_BACKGROUND,
			};
		}

		// Check for Illinois
		if (normalizedState === 'illinois' || normalizedState === 'il') {
			return {
				icon: <IllinoisIcon />,
				backgroundColor: ILLINOIS_BACKGROUND,
			};
		}

		// Check for Indiana
		if (normalizedState === 'indiana' || normalizedState === 'in') {
			return {
				icon: <IndianaIcon />,
				backgroundColor: INDIANA_BACKGROUND,
			};
		}

		// Check for Iowa
		if (normalizedState === 'iowa' || normalizedState === 'ia') {
			return {
				icon: <IowaIcon />,
				backgroundColor: IOWA_BACKGROUND,
			};
		}

		// Check for Kansas
		if (normalizedState === 'kansas' || normalizedState === 'ks') {
			return {
				icon: <KansasIcon />,
				backgroundColor: KANSAS_BACKGROUND,
			};
		}

		// Check for Kentucky
		if (normalizedState === 'kentucky' || normalizedState === 'ky') {
			return {
				icon: <KentuckyIcon />,
				backgroundColor: KENTUCKY_BACKGROUND,
			};
		}

		// Check for Louisiana
		if (normalizedState === 'louisiana' || normalizedState === 'la') {
			return {
				icon: <LouisianaIcon />,
				backgroundColor: LOUISIANA_BACKGROUND,
			};
		}

		// Check for Maine
		if (normalizedState === 'maine' || normalizedState === 'me') {
			return {
				icon: <MaineIcon />,
				backgroundColor: MAINE_BACKGROUND,
			};
		}

		// Check for Maryland
		if (normalizedState === 'maryland' || normalizedState === 'md') {
			return {
				icon: <MarylandIcon />,
				backgroundColor: MARYLAND_BACKGROUND,
			};
		}
	}

	// Default: non-city locations use SuburbsIcon
	return {
		icon: <SuburbsIcon />,
		backgroundColor: '#9DCBFF',
	};
};
