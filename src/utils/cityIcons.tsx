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
import {
	MassachusettsIcon,
	MASSACHUSETTS_BACKGROUND,
} from '@/components/atoms/_svg/MassachusettsIcon';
import { MichiganIcon, MICHIGAN_BACKGROUND } from '@/components/atoms/_svg/MichiganIcon';
import {
	MinnesotaIcon,
	MINNESOTA_BACKGROUND,
} from '@/components/atoms/_svg/MinnesotaIcon';
import {
	MississippiIcon,
	MISSISSIPPI_BACKGROUND,
} from '@/components/atoms/_svg/MississippiIcon';
import { MissouriIcon, MISSOURI_BACKGROUND } from '@/components/atoms/_svg/MissouriIcon';
import { MontanaIcon, MONTANA_BACKGROUND } from '@/components/atoms/_svg/MontanaIcon';
import { NebraskaIcon, NEBRASKA_BACKGROUND } from '@/components/atoms/_svg/NebraskaIcon';
import { NevadaIcon, NEVADA_BACKGROUND } from '@/components/atoms/_svg/NevadaIcon';
import {
	NewHampshireIcon,
	NEW_HAMPSHIRE_BACKGROUND,
} from '@/components/atoms/_svg/NewHampshireIcon';
import {
	NewJerseyIcon,
	NEW_JERSEY_BACKGROUND,
} from '@/components/atoms/_svg/NewJerseyIcon';
import {
	NewMexicoIcon,
	NEW_MEXICO_BACKGROUND,
} from '@/components/atoms/_svg/NewMexicoIcon';
import { NewYorkIcon, NEW_YORK_BACKGROUND } from '@/components/atoms/_svg/NewYorkIcon';
import {
	NorthCarolinaIcon,
	NORTH_CAROLINA_BACKGROUND,
} from '@/components/atoms/_svg/NorthCarolinaIcon';
import {
	NorthDakotaIcon,
	NORTH_DAKOTA_BACKGROUND,
} from '@/components/atoms/_svg/NorthDakotaIcon';
import { OhioIcon, OHIO_BACKGROUND } from '@/components/atoms/_svg/OhioIcon';
import { OklahomaIcon, OKLAHOMA_BACKGROUND } from '@/components/atoms/_svg/OklahomaIcon';
import { OregonIcon, OREGON_BACKGROUND } from '@/components/atoms/_svg/OregonIcon';
import {
	PennsylvaniaIcon,
	PENNSYLVANIA_BACKGROUND,
} from '@/components/atoms/_svg/PennsylvaniaIcon';
import {
	RhodeIslandIcon,
	RHODE_ISLAND_BACKGROUND,
} from '@/components/atoms/_svg/RhodeIslandIcon';
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

		// Check for Massachusetts
		if (normalizedState === 'massachusetts' || normalizedState === 'ma') {
			return {
				icon: <MassachusettsIcon />,
				backgroundColor: MASSACHUSETTS_BACKGROUND,
			};
		}

		// Check for Michigan
		if (normalizedState === 'michigan' || normalizedState === 'mi') {
			return {
				icon: <MichiganIcon />,
				backgroundColor: MICHIGAN_BACKGROUND,
			};
		}

		// Check for Minnesota
		if (normalizedState === 'minnesota' || normalizedState === 'mn') {
			return {
				icon: <MinnesotaIcon />,
				backgroundColor: MINNESOTA_BACKGROUND,
			};
		}

		// Check for Mississippi
		if (normalizedState === 'mississippi' || normalizedState === 'ms') {
			return {
				icon: <MississippiIcon />,
				backgroundColor: MISSISSIPPI_BACKGROUND,
			};
		}

		// Check for Missouri
		if (normalizedState === 'missouri' || normalizedState === 'mo') {
			return {
				icon: <MissouriIcon />,
				backgroundColor: MISSOURI_BACKGROUND,
			};
		}

		// Check for Montana
		if (normalizedState === 'montana' || normalizedState === 'mt') {
			return {
				icon: <MontanaIcon />,
				backgroundColor: MONTANA_BACKGROUND,
			};
		}

		// Check for Nebraska
		if (normalizedState === 'nebraska' || normalizedState === 'ne') {
			return {
				icon: <NebraskaIcon />,
				backgroundColor: NEBRASKA_BACKGROUND,
			};
		}

		// Check for Nevada
		if (normalizedState === 'nevada' || normalizedState === 'nv') {
			return {
				icon: <NevadaIcon />,
				backgroundColor: NEVADA_BACKGROUND,
			};
		}

		// Check for New Hampshire
		if (normalizedState === 'new hampshire' || normalizedState === 'nh') {
			return {
				icon: <NewHampshireIcon />,
				backgroundColor: NEW_HAMPSHIRE_BACKGROUND,
			};
		}

		// Check for New Jersey
		if (normalizedState === 'new jersey' || normalizedState === 'nj') {
			return {
				icon: <NewJerseyIcon />,
				backgroundColor: NEW_JERSEY_BACKGROUND,
			};
		}

		// Check for New Mexico
		if (normalizedState === 'new mexico' || normalizedState === 'nm') {
			return {
				icon: <NewMexicoIcon />,
				backgroundColor: NEW_MEXICO_BACKGROUND,
			};
		}

		// Check for New York
		if (normalizedState === 'new york' || normalizedState === 'ny') {
			return {
				icon: <NewYorkIcon />,
				backgroundColor: NEW_YORK_BACKGROUND,
			};
		}

		// Check for North Carolina
		if (normalizedState === 'north carolina' || normalizedState === 'nc') {
			return {
				icon: <NorthCarolinaIcon />,
				backgroundColor: NORTH_CAROLINA_BACKGROUND,
			};
		}

		// Check for North Dakota
		if (normalizedState === 'north dakota' || normalizedState === 'nd') {
			return {
				icon: <NorthDakotaIcon />,
				backgroundColor: NORTH_DAKOTA_BACKGROUND,
			};
		}

		// Check for Ohio
		if (normalizedState === 'ohio' || normalizedState === 'oh') {
			return {
				icon: <OhioIcon />,
				backgroundColor: OHIO_BACKGROUND,
			};
		}

		// Check for Oklahoma
		if (normalizedState === 'oklahoma' || normalizedState === 'ok') {
			return {
				icon: <OklahomaIcon />,
				backgroundColor: OKLAHOMA_BACKGROUND,
			};
		}

		// Check for Oregon
		if (normalizedState === 'oregon' || normalizedState === 'or') {
			return {
				icon: <OregonIcon />,
				backgroundColor: OREGON_BACKGROUND,
			};
		}

		// Check for Pennsylvania
		if (normalizedState === 'pennsylvania' || normalizedState === 'pa') {
			return {
				icon: <PennsylvaniaIcon />,
				backgroundColor: PENNSYLVANIA_BACKGROUND,
			};
		}

		// Check for Rhode Island
		if (normalizedState === 'rhode island' || normalizedState === 'ri') {
			return {
				icon: <RhodeIslandIcon />,
				backgroundColor: RHODE_ISLAND_BACKGROUND,
			};
		}
	}

	// Default: non-city locations use SuburbsIcon
	return {
		icon: <SuburbsIcon />,
		backgroundColor: '#9DCBFF',
	};
};
