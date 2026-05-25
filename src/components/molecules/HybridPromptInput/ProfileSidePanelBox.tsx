import type { ChangeEvent, ComponentType, SVGProps } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Pause, Play, X } from 'lucide-react';

import { useDeleteMedia, useGetMedia } from '@/hooks/queryHooks/useMediaAssets';
import { useMediaUpload, type UploadState } from '@/hooks/useMediaUpload';
import { MediaPreviewDialog } from '@/components/organisms/_dialogs/MediaPreviewDialog/MediaPreviewDialog';
import type { MediaAssetDto } from '@/app/api/media/route';

import { GenreClassicalIcon } from '@/components/atoms/_svg/GenreClassicalIcon';
import { GenreCountryIcon } from '@/components/atoms/_svg/GenreCountryIcon';
import { GenreElectronicIcon } from '@/components/atoms/_svg/GenreElectronicIcon';
import { GenreFolkIcon } from '@/components/atoms/_svg/GenreFolkIcon';
import { GenreGospelIcon } from '@/components/atoms/_svg/GenreGospelIcon';
import { GenreHipHopIcon } from '@/components/atoms/_svg/GenreHipHopIcon';
import { GenreJazzIcon } from '@/components/atoms/_svg/GenreJazzIcon';
import { GenrePopIcon } from '@/components/atoms/_svg/GenrePopIcon';
import { GenreRandBIcon } from '@/components/atoms/_svg/GenreRandBIcon';
import { GenreRockIcon } from '@/components/atoms/_svg/GenreRockIcon';

type ProfileSidePanelBoxProps = {
	profileName?: string | null;
	profileGenre?: string | null;
	profileArea?: string | null;
	profilePerformingName?: string | null;
	profileBio?: string | null;
	/**
	 * Optional: invoked when the user edits the profile name inline and commits
	 * (blur or Enter). Receives the trimmed name. Mirrors the inline name editing
	 * in HybridPromptInput's Profile tab. When omitted, the name is read-only.
	 */
	onProfileNameUpdate?: (name: string) => void;
	onProfileGenreUpdate?: (genre: string) => void | Promise<void>;
	onProfileAreaUpdate?: (area: string) => void | Promise<void>;
	onProfilePerformingNameUpdate?: (name: string | null) => void | Promise<void>;
	onProfileBioUpdate?: (bio: string | null) => void | Promise<void>;
};

const profileSwatchColors = ['#D5E5FC', '#EEF5FE', '#FFFFFF'] as const;
const profileFieldLabelClassName =
	'font-inter text-[10.292px] font-medium leading-[18.479px] text-[#9A9A9A]';
const completedProfileFieldLabelClassName =
	'font-inter text-[10.292px] font-black leading-[18.479px] text-[#76E59B]';

const DEFAULT_AREA_CENTER: [number, number] = [-98.5795, 39.8283];
const DEFAULT_AREA_ZOOM = 2.6;
const USER_AREA_ZOOM = 6;
const SELECTED_AREA_ZOOM = 7;
const PROFILE_AREA_MARKER_WIDTH = 26;
const PROFILE_AREA_MARKER_HEIGHT = 32;
const profileAreaMarkerSvg = `
	<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 13 16" fill="none">
		<path d="M6.0005 0.57373L10.5716 2.11649L12.5715 7.36188L9.71455 12.0016L6.28619 16.0013L3.14353 12.2873L0.572266 7.67043L1.14366 4.27635L2.85784 1.80794L6.0005 0.57373Z" fill="#FD7171"/>
		<path d="M11.4279 6.28727C11.4279 4.92339 10.8861 3.61536 9.92164 2.65095C8.95723 1.68654 7.6492 1.14474 6.28532 1.14474C4.92143 1.14474 3.61341 1.68654 2.649 2.65095C1.68459 3.61536 1.14279 4.92339 1.14279 6.28727C1.14279 8.39685 2.83068 11.1464 6.28532 14.4399C9.73996 11.1464 11.4279 8.39685 11.4279 6.28727ZM6.28532 16.0009C2.09473 12.192 0 8.95339 0 6.28727C0 4.6203 0.662202 3.02161 1.84093 1.84288C3.01965 0.664155 4.61835 0.00195313 6.28532 0.00195312C7.95229 0.00195313 9.55099 0.664155 10.7297 1.84288C11.9084 3.02161 12.5706 4.6203 12.5706 6.28727C12.5706 8.95339 10.4759 12.192 6.28532 16.0009Z" fill="black"/>
		<path d="M6.2847 8.00132C6.73933 8.00132 7.17533 7.82072 7.4968 7.49925C7.81828 7.17778 7.99888 6.74177 7.99888 6.28714C7.99888 5.83251 7.81828 5.3965 7.4968 5.07503C7.17533 4.75356 6.73933 4.57296 6.2847 4.57296C5.83007 4.57296 5.39406 4.75356 5.07259 5.07503C4.75112 5.3965 4.57052 5.83251 4.57052 6.28714C4.57052 6.74177 4.75112 7.17778 5.07259 7.49925C5.39406 7.82072 5.83007 8.00132 6.2847 8.00132ZM6.2847 9.1441C5.52698 9.1441 4.8003 8.8431 4.26452 8.30732C3.72873 7.77153 3.42773 7.04485 3.42773 6.28714C3.42773 5.52943 3.72873 4.80275 4.26452 4.26696C4.8003 3.73118 5.52698 3.43018 6.2847 3.43018C7.04241 3.43018 7.76909 3.73118 8.30488 4.26696C8.84066 4.80275 9.14166 5.52943 9.14166 6.28714C9.14166 7.04485 8.84066 7.77153 8.30488 8.30732C7.76909 8.8431 7.04241 9.1441 6.2847 9.1441Z" fill="black"/>
		<circle cx="6.28449" cy="6.28791" r="1.71418" fill="white"/>
	</svg>
`;
const profilePerformingNameIconSvg = `
	<svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
		<g clip-path="url(#profile-performing-name-icon-clip)">
			<path d="M15.5509 8.00101C15.5509 11.1578 13.6133 13.8621 10.8623 14.989C9.98029 15.3504 9.01448 15.5499 8.00202 15.5499C6.98955 15.5499 6.02375 15.3504 5.14169 14.989C2.39068 13.8621 0.453125 11.1578 0.453125 8.00101C0.453125 4.84418 2.39068 2.13989 5.14166 1.01305C6.02375 0.651616 6.98952 0.452148 8.00199 0.452148C9.01445 0.452148 9.98026 0.651616 10.8623 1.01305C13.6133 2.13989 15.5509 4.84425 15.5509 8.00101Z" fill="#D5D5D5"/>
			<path d="M8.00091 10.7499C9.51695 10.7499 10.746 9.52086 10.746 8.00481C10.746 6.48876 9.51695 5.25977 8.00091 5.25977C6.48486 5.25977 5.25586 6.48876 5.25586 8.00481C5.25586 9.52086 6.48486 10.7499 8.00091 10.7499Z" fill="#A2A8D3"/>
			<path d="M5.35985 8.76465L1.03125 10.9149C1.3994 11.7943 1.94128 12.6182 2.65721 13.3342C3.37314 14.05 4.19711 14.592 5.07641 14.9601L7.22671 10.6315C6.32869 10.3701 5.62122 9.66267 5.35985 8.76465Z" fill="#FFDC64"/>
			<path d="M10.6366 7.23462L14.9651 5.08423C14.5969 4.20492 14.0551 3.38096 13.3391 2.66502C12.6232 1.94915 11.7992 1.40722 10.9199 1.03906L8.76953 5.3676C9.66762 5.629 10.3751 6.3365 10.6366 7.23462Z" fill="#FFDC64"/>
			<path d="M7.99706 8.91599C8.50241 8.91599 8.91208 8.50632 8.91208 8.00096C8.91208 7.49561 8.50241 7.08594 7.99706 7.08594C7.4917 7.08594 7.08203 7.49561 7.08203 8.00096C7.08203 8.50632 7.4917 8.91599 7.99706 8.91599Z" fill="#767B95"/>
			<path d="M8.0028 9.36401C7.24953 9.36401 6.63672 8.7512 6.63672 7.99792C6.63672 7.24465 7.24953 6.63184 8.0028 6.63184C8.75608 6.63184 9.36889 7.24465 9.36889 7.99792C9.36889 8.7512 8.75611 9.36401 8.0028 9.36401ZM8.0028 7.53389C7.74696 7.53389 7.53884 7.74202 7.53884 7.99786C7.53884 8.2537 7.74696 8.46183 8.0028 8.46183C8.25865 8.46183 8.46677 8.2537 8.46677 7.99786C8.46677 7.74202 8.25865 7.53389 8.0028 7.53389Z" fill="black"/>
			<path d="M12.1307 4.3217C12.1014 4.3217 12.0716 4.31895 12.0423 4.31313C12.0134 4.30726 11.9854 4.2987 11.9579 4.28741C11.9309 4.27613 11.9047 4.26217 11.8803 4.24592C11.8555 4.22923 11.8325 4.21079 11.8113 4.18954C11.7906 4.16879 11.7721 4.14579 11.7554 4.12098C11.7392 4.09663 11.7252 4.07045 11.7139 4.04335C11.7026 4.01589 11.6941 3.98792 11.6882 3.95904C11.6823 3.92973 11.6797 3.90035 11.6797 3.87064C11.6797 3.84132 11.6824 3.81195 11.6882 3.78267C11.6941 3.75376 11.7026 3.72532 11.7139 3.69832C11.7252 3.67123 11.7392 3.64464 11.7554 3.62029C11.7721 3.59548 11.7906 3.57248 11.8113 3.55173C11.8325 3.53098 11.8556 3.51204 11.8803 3.49579C11.9047 3.47954 11.9309 3.46558 11.9579 3.45429C11.9854 3.44301 12.0134 3.43445 12.0423 3.42858C12.1893 3.39886 12.3449 3.44708 12.4496 3.55173C12.4703 3.57248 12.4893 3.59548 12.5055 3.62029C12.5217 3.64464 12.5357 3.67126 12.547 3.69832C12.5582 3.72539 12.5668 3.75376 12.5727 3.78267C12.5786 3.81195 12.5817 3.84129 12.5817 3.87064C12.5817 3.90035 12.5786 3.92973 12.5727 3.95904C12.5668 3.98792 12.5582 4.01589 12.547 4.04335C12.5357 4.07045 12.5217 4.09663 12.5055 4.12098C12.4893 4.14579 12.4703 4.16879 12.4496 4.18954C12.3657 4.27382 12.2493 4.3217 12.1307 4.3217Z" fill="black"/>
			<path d="M15.2231 4.56176C15.2211 4.55748 15.2191 4.55314 15.217 4.54886C15.1917 4.49614 15.166 4.44357 15.1395 4.39136C15.1261 4.36489 15.1122 4.33867 15.0986 4.31239C15.0878 4.29164 15.077 4.27086 15.0661 4.25014C15.0465 4.21339 15.0266 4.17683 15.0066 4.14036C15.0032 4.13423 14.9998 4.12814 14.9964 4.12205C14.7832 3.73752 14.5387 3.37174 14.264 3.02668C14.2578 3.01886 14.2516 3.01121 14.2453 3.00346C14.1974 2.94368 14.1485 2.88452 14.0987 2.82602C14.0852 2.81008 14.072 2.79405 14.0584 2.77821C14.011 2.72337 13.9627 2.66915 13.9137 2.61543C13.8803 2.57877 13.8464 2.54262 13.8124 2.50659C13.7967 2.4899 13.7807 2.47331 13.7647 2.45674C13.6405 2.32734 13.5122 2.20234 13.3799 2.0819C13.3726 2.07521 13.3652 2.06859 13.3578 2.06187C13.2679 1.98068 13.1765 1.90134 13.0832 1.82437C13.0807 1.82225 13.0781 1.82003 13.0756 1.81793C13.0371 1.78628 12.9982 1.75525 12.9591 1.72428C12.93 1.70119 12.9006 1.67844 12.8712 1.65575C12.839 1.631 12.8069 1.60594 12.7744 1.58169C12.7139 1.53659 12.6528 1.49256 12.5912 1.44925C12.5691 1.43378 12.5468 1.41856 12.5246 1.40328C12.4668 1.36359 12.4087 1.32466 12.35 1.28653C12.3377 1.27859 12.3257 1.27044 12.3134 1.26259C12.2389 1.21478 12.1635 1.16841 12.0874 1.12316C12.0774 1.11719 12.0673 1.11138 12.0573 1.10547C11.9816 1.06091 11.9053 1.01738 11.8281 0.975346C11.8255 0.973908 11.8229 0.972408 11.8203 0.970971C11.739 0.926815 11.6568 0.884096 11.5739 0.84269C11.5647 0.838128 11.5555 0.833659 11.5464 0.829159C11.4694 0.791128 11.3919 0.754191 11.3136 0.718566C11.3068 0.715504 11.3 0.712254 11.2932 0.709191C11.2263 0.678973 11.159 0.64941 11.0911 0.620973C11.0859 0.618754 11.0805 0.617223 11.0752 0.615254C11.0599 0.608848 11.0449 0.601848 11.0295 0.595536C10.0664 0.201069 9.04659 0.000976562 7.998 0.000976562C6.94941 0.000976562 5.92961 0.201069 4.96671 0.595567C3.51487 1.19025 2.27791 2.19153 1.38935 3.49111C0.479138 4.82257 -0.00195312 6.38203 -0.00195312 8.0009C-0.00195312 9.20311 0.263577 10.3724 0.772917 11.4401C0.774949 11.4443 0.776917 11.4487 0.779011 11.453C0.804261 11.5057 0.830011 11.5583 0.856511 11.6105C0.869854 11.6369 0.88376 11.6632 0.897417 11.6894C0.908229 11.7102 0.918979 11.731 0.929948 11.7517C0.949479 11.7884 0.969385 11.825 0.989447 11.8615C0.992822 11.8676 0.996229 11.8737 0.999604 11.8798C1.21279 12.2643 1.45726 12.6301 1.73201 12.9751C1.73819 12.983 1.74444 12.9906 1.75069 12.9984C1.79863 13.0581 1.8475 13.1173 1.89725 13.1758C1.91075 13.1917 1.924 13.2078 1.93763 13.2236C1.98504 13.2785 2.03335 13.3327 2.08232 13.3864C2.11569 13.4231 2.14957 13.4592 2.18357 13.4952C2.19935 13.5119 2.21532 13.5285 2.23125 13.5451C2.35547 13.6745 2.48375 13.7995 2.61606 13.9199C2.62341 13.9266 2.63081 13.9332 2.63822 13.94C2.72806 14.0211 2.81947 14.1005 2.91278 14.1775C2.91534 14.1796 2.91787 14.1818 2.92044 14.1839C2.9589 14.2155 2.99784 14.2466 3.0369 14.2775C3.06603 14.3006 3.09537 14.3233 3.12478 14.346C3.157 14.3708 3.18906 14.3959 3.22162 14.4201C3.28206 14.4652 3.34321 14.5092 3.40484 14.5525C3.42693 14.568 3.44918 14.5832 3.4714 14.5985C3.52915 14.6382 3.58734 14.6771 3.64599 14.7153C3.65828 14.7232 3.67034 14.7314 3.68262 14.7392C3.75715 14.787 3.83249 14.8334 3.90859 14.8786C3.91859 14.8846 3.92865 14.8904 3.93868 14.8963C4.01437 14.9409 4.09068 14.9844 4.16787 15.0264C4.17049 15.0279 4.17308 15.0294 4.17571 15.0308C4.25699 15.075 4.33921 15.1177 4.42211 15.1591C4.43127 15.1637 4.44046 15.1681 4.44961 15.1726C4.52655 15.2107 4.60411 15.2476 4.68239 15.2832C4.68921 15.2863 4.69596 15.2895 4.70277 15.2926C4.76971 15.3228 4.83702 15.3524 4.90489 15.3808C4.90999 15.3829 4.91524 15.3845 4.92036 15.3864C4.93583 15.3929 4.95095 15.3999 4.96645 15.4063C5.92939 15.8008 6.94926 16.0009 7.99778 16.0009C9.04631 16.0009 10.0663 15.8009 11.0291 15.4064C12.481 14.8117 13.7179 13.8104 14.6065 12.5108C15.5167 11.1794 15.9978 9.61992 15.9978 8.00105C15.998 6.79872 15.7324 5.62938 15.2231 4.56176ZM4.86946 14.3734C4.85774 14.3676 4.84574 14.3623 4.83405 14.3565C4.82133 14.3501 4.80864 14.3437 4.79602 14.3373C4.73027 14.3042 4.66518 14.2701 4.60074 14.2351C4.57986 14.2237 4.55915 14.212 4.53836 14.2004C4.49665 14.1772 4.45543 14.1534 4.41427 14.1295C4.36018 14.0978 4.30643 14.0655 4.25321 14.0325C4.24315 14.0263 4.23308 14.02 4.22308 14.0137C3.77546 13.7322 3.3594 13.4001 2.97915 13.0199C2.42172 12.4624 1.96738 11.8281 1.62491 11.1299L5.12145 9.39292C5.21177 9.57879 5.31955 9.75467 5.4427 9.91842L4.51846 10.8427C4.3423 11.0188 4.3423 11.3044 4.51846 11.4806C4.60655 11.5687 4.72199 11.6127 4.83739 11.6127C4.95283 11.6127 5.06824 11.5687 5.15633 11.4806L6.08057 10.5564C6.24432 10.6795 6.42017 10.7873 6.60607 10.8776L4.86946 14.3734ZM7.34766 10.2005C7.25785 10.1739 7.17016 10.1421 7.08504 10.1049C7.08344 10.1042 7.08188 10.1035 7.08029 10.1028C7.03819 10.0843 6.99676 10.0645 6.95598 10.0436C6.95454 10.0428 6.95304 10.0421 6.95157 10.0414C6.52716 9.82192 6.17704 9.47183 5.95761 9.04739C5.95682 9.04595 5.95611 9.04445 5.95536 9.04298C5.93439 9.0022 5.91467 8.96077 5.89617 8.91867C5.89545 8.91705 5.89473 8.91552 5.89401 8.91392C5.85686 8.82886 5.82501 8.74111 5.79848 8.6513C5.73736 8.44499 5.70401 8.22686 5.70401 8.00096C5.70401 6.73603 6.73307 5.70697 7.998 5.70697C8.22403 5.70697 8.44231 5.74035 8.64872 5.80157C8.73825 5.828 8.82572 5.85975 8.91053 5.89679C8.91253 5.89769 8.91446 5.89863 8.91649 5.8995C8.95812 5.91782 8.99918 5.93735 9.03956 5.9581C9.04131 5.959 9.04303 5.95991 9.04474 5.96082C9.46912 6.18025 9.81915 6.53038 10.0385 6.95478C10.0392 6.95612 10.0399 6.95753 10.0406 6.95887C10.0617 6.99987 10.0815 7.04156 10.1001 7.08387C10.1007 7.08522 10.1014 7.08659 10.102 7.08793C10.1393 7.17328 10.1712 7.26125 10.1978 7.35137C10.2588 7.55749 10.292 7.77543 10.292 8.00102C10.292 9.26595 9.26299 10.295 7.99806 10.295C7.77216 10.2949 7.55397 10.2616 7.34766 10.2005ZM10.5534 6.08347L11.4776 5.15923C11.6538 4.98307 11.6538 4.69748 11.4776 4.52129C11.3014 4.3452 11.0159 4.3452 10.8397 4.52129L9.91543 5.44554C9.75168 5.32238 9.57584 5.21454 9.3899 5.12426L11.1266 1.62847C11.1383 1.63419 11.1503 1.63956 11.162 1.64537C11.1747 1.65169 11.1874 1.65812 11.2 1.6645C11.2657 1.69765 11.3308 1.73165 11.3952 1.76665C11.4162 1.77806 11.4369 1.78984 11.4578 1.80143C11.4994 1.82462 11.5406 1.84834 11.5817 1.87231C11.6359 1.90406 11.6899 1.9364 11.7433 1.96959C11.7531 1.97568 11.7629 1.98178 11.7727 1.9879C12.2204 2.26946 12.6365 2.60168 13.0169 2.98199C13.5743 3.53942 14.0287 4.17373 14.3711 4.87195L10.8746 6.609C10.7844 6.42313 10.6765 6.24725 10.5534 6.08347ZM5.30867 1.43031C6.16254 1.0805 7.06738 0.903096 7.998 0.903096C8.78606 0.903096 9.55549 1.03078 10.2913 1.28222L8.51975 4.8481C8.34984 4.8201 8.17572 4.80485 7.998 4.80485C6.23563 4.80485 4.80189 6.2386 4.80189 8.00096C4.80189 8.17868 4.81714 8.3529 4.84521 8.5228L1.27791 10.2949C1.03201 9.57026 0.900198 8.79767 0.900198 8.0009C0.900198 5.10645 2.63059 2.52731 5.30867 1.43031ZM10.6873 14.5715C9.83346 14.9214 8.92868 15.0987 7.998 15.0987C7.20991 15.0987 6.44051 14.971 5.70473 14.7196L7.47616 11.1537C7.64606 11.1818 7.82028 11.197 7.998 11.197C9.76036 11.197 11.1941 9.76329 11.1941 8.00093C11.1941 7.82321 11.1789 7.64906 11.1509 7.47918L14.7181 5.70701C14.964 6.43163 15.0959 7.20418 15.0959 8.00093C15.0958 10.8954 13.3654 13.4746 10.6873 14.5715Z" fill="black"/>
			<path d="M3.86314 12.5808C3.83383 12.5808 3.80401 12.5776 3.77517 12.5717C3.74626 12.5658 3.71783 12.5573 3.69083 12.546C3.66333 12.5347 3.63714 12.5208 3.6128 12.5045C3.58798 12.4883 3.56498 12.4694 3.54423 12.4486C3.52348 12.4279 3.50455 12.4048 3.4883 12.38C3.47211 12.3557 3.45808 12.3295 3.4468 12.302C3.43552 12.2749 3.42698 12.2466 3.42108 12.2177C3.4152 12.1888 3.41211 12.159 3.41211 12.1297C3.41211 12.1004 3.41523 12.0706 3.42108 12.0413C3.42698 12.0129 3.43552 11.9845 3.4468 11.957C3.45808 11.9299 3.47211 11.9038 3.4883 11.8794C3.50455 11.8545 3.52348 11.8315 3.54423 11.8108C3.56498 11.7896 3.58798 11.7711 3.6128 11.7544C3.63714 11.7382 3.66333 11.7242 3.69083 11.7129C3.71789 11.7016 3.74626 11.6931 3.77517 11.6872C3.92132 11.6579 4.07739 11.7057 4.18204 11.8108C4.20279 11.8315 4.22173 11.8545 4.23842 11.8794C4.25467 11.9037 4.26864 11.9299 4.27992 11.957C4.2912 11.9845 4.29976 12.0129 4.30564 12.0413C4.31151 12.0706 4.3142 12.1004 4.3142 12.1297C4.3142 12.159 4.31145 12.1888 4.30564 12.2177C4.29976 12.2466 4.2912 12.275 4.27992 12.302C4.26864 12.3295 4.25467 12.3557 4.23842 12.38C4.22173 12.4048 4.20279 12.4279 4.18204 12.4486C4.16129 12.4694 4.13829 12.4883 4.11348 12.5045C4.08914 12.5208 4.06295 12.5347 4.03589 12.546C4.00839 12.5573 3.97995 12.5658 3.95154 12.5717C3.9222 12.5776 3.89242 12.5808 3.86314 12.5808Z" fill="black"/>
		</g>
		<defs>
			<clipPath id="profile-performing-name-icon-clip">
				<rect width="16" height="16" fill="white"/>
			</clipPath>
		</defs>
	</svg>
`;
const profileBioIconSvg = `
	<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 8 17" fill="none">
		<path d="M3.82865 0C4.67695 0 5.36761 0.690658 5.36761 1.53897C5.36761 2.38727 4.67695 3.07793 3.82865 3.07793C2.98034 3.07793 2.28968 2.38727 2.28968 1.53897C2.28968 0.690658 2.98034 0 3.82865 0ZM5.76549 3.47581H1.92183C0.855815 3.47581 0 4.33163 0 5.39764V10.0971C0 10.465 0.292779 10.7728 0.675644 10.7728C1.05851 10.7728 1.35129 10.48 1.35129 10.0971V5.78051C1.35129 5.67541 1.44137 5.58532 1.54647 5.58532C1.65157 5.58532 1.74166 5.67541 1.74166 5.78051V15.949C1.74166 16.5271 2.16957 17 2.70257 17C3.23558 17 3.66349 16.5271 3.66349 15.949V10.7878C3.66349 10.6827 3.75358 10.5926 3.85868 10.5926C3.96378 10.5926 4.05386 10.6827 4.05386 10.7878V15.949C4.05386 16.5271 4.48177 17 5.01478 17C5.54778 17 5.97569 16.5271 5.97569 15.949V5.78051C5.97569 5.67541 6.06578 5.58532 6.17088 5.58532C6.27598 5.58532 6.36606 5.67541 6.36606 5.78051V10.1046C6.36606 10.4725 6.65884 10.7803 7.04171 10.7803C7.42457 10.7803 7.71735 10.4875 7.71735 10.1046V5.39764C7.68732 4.33163 6.80899 3.47581 5.76549 3.47581Z" fill="black"/>
	</svg>
`;
const profileVideoAddIconSvg = `
	<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 17 17" fill="none">
		<line x1="8.87194" y1="3.23084e-08" x2="8.87194" y2="17" stroke="#7F7F7F" stroke-width="1.47826"/>
		<line y1="8.87024" x2="17" y2="8.87024" stroke="#7F7F7F" stroke-width="1.47826"/>
	</svg>
`;
const decorativeAreaMapBackground =
	'linear-gradient(135deg, rgba(63, 191, 214, 0.9) 0%, rgba(63, 191, 214, 0.9) 28%, transparent 28%), linear-gradient(35deg, rgba(178, 233, 207, 0.95) 0%, rgba(178, 233, 207, 0.95) 68%, rgba(134, 219, 185, 0.95) 68%), linear-gradient(110deg, transparent 0 47%, rgba(255, 255, 255, 0.55) 47% 50%, transparent 50%), #B1E6CE';

type GenreOption = {
	label: string;
	width: number;
	Icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

type ProfileFieldLabelProps = {
	children: string;
	completed: boolean;
	className?: string;
};

const ProfileFieldLabel = ({
	children,
	completed,
	className = '',
}: ProfileFieldLabelProps) => (
	<div
		className={`${completed ? completedProfileFieldLabelClassName : profileFieldLabelClassName} ${className}`}
	>
		<span className="relative inline-flex">
			{completed && (
				<span
					aria-hidden="true"
					className="absolute left-[-5px] right-[-5px] top-1/2 h-[7px] -translate-y-1/2 rounded-[3px] bg-[#D6FFED]"
				/>
			)}
			<span className="relative z-10">{children}</span>
		</span>
	</div>
);

const genreOptionRows: GenreOption[][] = [
	[
		{ label: 'Pop', width: 61.984, Icon: GenrePopIcon },
		{ label: 'Rock', width: 70, Icon: GenreRockIcon },
		{ label: 'Country', width: 84, Icon: GenreCountryIcon },
		{ label: 'Jazz', width: 69, Icon: GenreJazzIcon },
	],
	[
		{ label: 'Electronic', width: 102, Icon: GenreElectronicIcon },
		{ label: 'Classical', width: 99, Icon: GenreClassicalIcon },
		{ label: 'Hip-Hop', width: 91, Icon: GenreHipHopIcon },
	],
	[
		{ label: 'Gospel', width: 83, Icon: GenreGospelIcon },
		{ label: 'R&B', width: 61, Icon: GenreRandBIcon },
		{ label: 'Folk', width: 67, Icon: GenreFolkIcon },
		{ label: 'Other', width: 67 },
	],
];

type AreaCoordinates = { lat: number; lng: number };

type ProfileAreaMapBoxProps = {
	area: string;
	onAreaUpdate?: (area: string) => void | Promise<void>;
};

const formatReverseGeocodeArea = (feature: {
	properties?: {
		name?: string;
		full_address?: string;
		place_formatted?: string;
		context?: Record<string, { name?: string } | undefined>;
	};
}) => {
	const context = feature.properties?.context;
	const city =
		context?.place?.name ||
		context?.locality?.name ||
		context?.district?.name ||
		feature.properties?.name;
	const region = context?.region?.name;
	const formatted = [city, region].filter(Boolean).join(', ');
	return (
		formatted ||
		feature.properties?.full_address ||
		feature.properties?.place_formatted ||
		feature.properties?.name ||
		''
	);
};

const ProfileAreaMapBox = ({ area, onAreaUpdate }: ProfileAreaMapBoxProps) => {
	const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const markerRef = useRef<mapboxgl.Marker | null>(null);
	const geocodeGenRef = useRef(0);
	const forwardGeocodeGenRef = useRef(0);
	const [isMapReady, setIsMapReady] = useState(false);
	const [mapError, setMapError] = useState<string | null>(null);
	const [areaQuery, setAreaQuery] = useState(area);
	const [isEditingArea, setIsEditingArea] = useState(false);
	const [isGeocodingArea, setIsGeocodingArea] = useState(false);
	const [geocodeError, setGeocodeError] = useState<string | null>(null);
	const [userLocation, setUserLocation] = useState<AreaCoordinates | null>(null);
	const [areaCoordinates, setAreaCoordinates] = useState<AreaCoordinates | null>(null);
	const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
	const areaStatus = isGeocodingArea
		? 'Searching area...'
		: geocodeError || (isReverseGeocoding ? 'Saving area...' : mapError);

	useEffect(() => {
		if (!isEditingArea) setAreaQuery(area);
	}, [area, isEditingArea]);

	useEffect(() => {
		if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
		let cancelled = false;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				if (cancelled) return;
				setUserLocation({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				});
			},
			() => {
				/* permission denied or unavailable - silently degrade */
			},
			{ enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 8000 }
		);
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!mapContainerRef.current || mapRef.current) return;
		if (!mapboxToken) {
			setMapError('Map token missing');
			console.warn(
				'[ProfileAreaMapBox] Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN - map will not render.'
			);
			return;
		}
		setMapError(null);

		mapboxgl.accessToken = mapboxToken;
		let map: mapboxgl.Map;
		try {
			map = new mapboxgl.Map({
				container: mapContainerRef.current,
				style: 'mapbox://styles/mapbox/streets-v12',
				center: DEFAULT_AREA_CENTER,
				zoom: DEFAULT_AREA_ZOOM,
				attributionControl: false,
			});
		} catch (error) {
			setMapError('Map unavailable');
			console.warn('[ProfileAreaMapBox] Mapbox failed to initialize.', error);
			return;
		}
		map.dragRotate.disable();
		map.touchZoomRotate.disableRotation();
		map.keyboard.disable();
		mapRef.current = map;
		setIsMapReady(true);

		map.once('load', () => {
			setMapError(null);
			map.resize();
		});
		map.on('error', (event) => {
			setMapError('Map failed to load');
			console.warn('[ProfileAreaMapBox] Mapbox failed to render.', event);
		});

		const rafId = window.requestAnimationFrame(() => map.resize());
		const settleTimer = window.setTimeout(() => mapRef.current?.resize(), 220);
		const resizeObserver =
			typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(() => map.resize())
				: null;
		if (resizeObserver && mapContainerRef.current) {
			resizeObserver.observe(mapContainerRef.current);
		}

		return () => {
			window.cancelAnimationFrame(rafId);
			window.clearTimeout(settleTimer);
			resizeObserver?.disconnect();
			markerRef.current?.remove();
			markerRef.current = null;
			map.remove();
			mapRef.current = null;
			setIsMapReady(false);
		};
	}, [mapboxToken]);

	const commitCoordinates = useCallback(
		async (next: AreaCoordinates) => {
			if (!mapboxToken) return;
			const myGen = ++geocodeGenRef.current;
			const fallback = `${next.lat.toFixed(3)}, ${next.lng.toFixed(3)}`;
			setAreaCoordinates(next);
			setIsReverseGeocoding(true);

			try {
				const url = new URL('https://api.mapbox.com/search/geocode/v6/reverse');
				url.searchParams.set('longitude', String(next.lng));
				url.searchParams.set('latitude', String(next.lat));
				url.searchParams.set('limit', '1');
				url.searchParams.set('types', 'place,locality,district,region');
				url.searchParams.set('access_token', mapboxToken);

				const res = await fetch(url.toString());
				if (myGen !== geocodeGenRef.current) return;
				if (!res.ok) {
					onAreaUpdate?.(fallback);
					return;
				}

				const data = (await res.json()) as {
					features?: Array<{
						properties?: {
							name?: string;
							full_address?: string;
							place_formatted?: string;
							context?: Record<string, { name?: string } | undefined>;
						};
					}>;
				};
				const formatted = data.features?.[0]
					? formatReverseGeocodeArea(data.features[0])
					: '';
				onAreaUpdate?.(formatted || fallback);
			} catch {
				if (myGen === geocodeGenRef.current) onAreaUpdate?.(fallback);
			} finally {
				if (myGen === geocodeGenRef.current) setIsReverseGeocoding(false);
			}
		},
		[mapboxToken, onAreaUpdate]
	);

	const runAreaGeocode = useCallback(async () => {
		const trimmed = areaQuery.trim();
		if (!trimmed) return;
		if (!mapboxToken) {
			setGeocodeError('Map token missing');
			return;
		}

		const myGen = ++forwardGeocodeGenRef.current;
		setIsGeocodingArea(true);
		setGeocodeError(null);

		try {
			const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
			url.searchParams.set('q', trimmed);
			url.searchParams.set('limit', '1');
			url.searchParams.set('country', 'us');
			url.searchParams.set('access_token', mapboxToken);
			if (userLocation) {
				url.searchParams.set('proximity', `${userLocation.lng},${userLocation.lat}`);
			}

			const res = await fetch(url.toString());
			if (myGen !== forwardGeocodeGenRef.current) return;
			if (!res.ok) {
				setGeocodeError('Lookup failed');
				return;
			}

			const data = (await res.json()) as {
				features?: Array<{
					geometry?: { coordinates?: [number, number] };
					properties?: {
						name?: string;
						full_address?: string;
						place_formatted?: string;
						context?: Record<string, { name?: string } | undefined>;
					};
				}>;
			};
			const feature = data.features?.[0];
			const coords = feature?.geometry?.coordinates;
			if (!feature || !coords || coords.length < 2) {
				setGeocodeError('No match');
				return;
			}

			const [nextLng, nextLat] = coords;
			const formatted = formatReverseGeocodeArea(feature) || trimmed;
			setAreaCoordinates({ lat: nextLat, lng: nextLng });
			setAreaQuery(formatted);
			setIsEditingArea(false);
			onAreaUpdate?.(formatted);
		} catch {
			if (myGen === forwardGeocodeGenRef.current) setGeocodeError('Lookup failed');
		} finally {
			if (myGen === forwardGeocodeGenRef.current) setIsGeocodingArea(false);
		}
	}, [areaQuery, mapboxToken, onAreaUpdate, userLocation]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map || !isMapReady) return;

		const markerPosition = areaCoordinates ??
			userLocation ?? {
				lat: DEFAULT_AREA_CENTER[1],
				lng: DEFAULT_AREA_CENTER[0],
			};
		const hasConcretePosition = Boolean(areaCoordinates || userLocation);

		if (!markerRef.current) {
			const el = document.createElement('div');
			el.dataset.profileAreaMarker = 'true';
			el.innerHTML = profileAreaMarkerSvg;
			Object.assign(el.style, {
				width: `${PROFILE_AREA_MARKER_WIDTH}px`,
				height: `${PROFILE_AREA_MARKER_HEIGHT}px`,
				display: 'block',
				boxSizing: 'border-box',
				cursor: 'grab',
			});

			const marker = new mapboxgl.Marker({
				element: el,
				anchor: 'bottom',
				draggable: true,
			})
				.setLngLat([markerPosition.lng, markerPosition.lat])
				.addTo(map);
			marker.on('dragstart', () => {
				el.style.cursor = 'grabbing';
			});
			marker.on('dragend', () => {
				el.style.cursor = 'grab';
				const lngLat = marker.getLngLat();
				void commitCoordinates({ lat: lngLat.lat, lng: lngLat.lng });
			});
			markerRef.current = marker;
		} else {
			markerRef.current.setLngLat([markerPosition.lng, markerPosition.lat]);
		}

		map.easeTo({
			center: [markerPosition.lng, markerPosition.lat],
			zoom: areaCoordinates
				? SELECTED_AREA_ZOOM
				: hasConcretePosition
					? USER_AREA_ZOOM
					: DEFAULT_AREA_ZOOM,
			duration: hasConcretePosition ? 350 : 0,
		});
	}, [areaCoordinates, userLocation, isMapReady, commitCoordinates]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map || !isMapReady) return;

		const handleClick = (event: mapboxgl.MapMouseEvent) => {
			void commitCoordinates({ lat: event.lngLat.lat, lng: event.lngLat.lng });
		};

		map.on('click', handleClick);
		return () => {
			map.off('click', handleClick);
		};
	}, [isMapReady, commitCoordinates]);

	return (
		<div className="relative mt-[5px] box-border h-[129px] w-[334px] shrink-0 overflow-hidden rounded-[9px] border-[1.526px] border-black bg-white opacity-80">
			<style jsx global>{`
				.profile-side-panel-area-map-root,
				.profile-side-panel-area-map-root.mapboxgl-map,
				.profile-side-panel-area-map-root .mapboxgl-canvas-container,
				.profile-side-panel-area-map-root .mapboxgl-canvas {
					width: 100% !important;
					height: 100% !important;
				}

				.profile-side-panel-area-map-root.mapboxgl-map,
				.profile-side-panel-area-map-root .mapboxgl-canvas-container,
				.profile-side-panel-area-map-root .mapboxgl-canvas {
					position: absolute !important;
					inset: 0 !important;
				}

				.profile-side-panel-area-map-root .mapboxgl-marker {
					position: absolute;
					left: 0;
					top: 0;
				}

				.profile-side-panel-area-map-root .mapboxgl-ctrl-logo,
				.profile-side-panel-area-map-root .mapboxgl-ctrl-attrib {
					display: none !important;
				}
			`}</style>
			<div className="box-border flex h-[27px] items-center border-b-[1.526px] border-black px-[10px] font-inter text-[17.507px] font-medium leading-[23.342px] text-black">
				{isEditingArea ? (
					<input
						type="text"
						value={areaQuery}
						placeholder="Choose your Area"
						onChange={(event) => {
							setAreaQuery(event.target.value);
							if (geocodeError) setGeocodeError(null);
						}}
						onBlur={() => {
							if (isGeocodingArea) return;
							setAreaQuery(area);
							setIsEditingArea(false);
						}}
						onFocus={(event) => event.currentTarget.select()}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								void runAreaGeocode();
							} else if (event.key === 'Escape') {
								event.preventDefault();
								setAreaQuery(area);
								setIsEditingArea(false);
							}
						}}
						autoFocus
						className="h-full w-full border-0 bg-transparent p-0 font-inter text-[17.507px] font-medium leading-[23.342px] text-black outline-none placeholder:text-black"
					/>
				) : (
					<button
						type="button"
						onClick={() => {
							setAreaQuery(area);
							setIsEditingArea(true);
						}}
						className="h-full w-full appearance-none border-0 bg-transparent p-0 text-left font-inter text-[17.507px] font-medium leading-[23.342px] text-black"
					>
						Choose your Area
					</button>
				)}
			</div>
			<div
				style={{ background: mapboxToken ? '#E5E3DF' : decorativeAreaMapBackground }}
				className="absolute inset-x-0 bottom-0 top-[27px] overflow-hidden"
			>
				<div
					ref={mapContainerRef}
					className="profile-side-panel-area-map-root"
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: '100%',
						height: '100%',
					}}
				/>
				{area && (
					<div className="pointer-events-none absolute bottom-[9px] left-[10px] right-[10px] truncate text-center font-inter text-[14px] font-medium leading-[18px] text-black">
						{area}
					</div>
				)}
				{areaStatus && (
					<div className="pointer-events-none absolute left-1/2 top-[7px] -translate-x-1/2 rounded-full bg-white/90 px-[8px] py-[1px] font-inter text-[10px] font-semibold leading-[14px] text-black shadow-sm">
						{areaStatus}
					</div>
				)}
			</div>
		</div>
	);
};

const profileMediaWaveformBars = [
	48, 60, 54, 66, 56, 70, 62, 64, 67, 65, 69, 61, 63, 68, 60, 71, 62, 66, 57,
	65, 60, 69, 62, 61, 66, 72, 64, 68, 56, 62, 73, 66, 60, 69, 67, 64, 57, 62,
	66, 61, 65, 70, 59, 64, 62, 67, 71, 69, 63, 66, 61, 64, 67, 70, 66, 63, 62,
	65, 60, 50, 48, 44, 40, 35, 30,
] as const;

const getMediaDisplayTitle = (filename: string) =>
	filename.replace(/\.[^/.]+$/, '').trim() || filename;

const ProfileMediaWaveform = () => {
	const bars = (
		<div className="flex h-full w-max items-center">
			{profileMediaWaveformBars.map((height, index) => (
				<span
					key={`waveform-${index}`}
					className="block w-[3px]"
					style={{ height: `${height}%`, backgroundColor: '#ABAABF' }}
				/>
			))}
		</div>
	);

	return (
		<div aria-hidden="true" className="relative h-[32px] w-full overflow-hidden">
			{bars}
		</div>
	);
};

/** A filled media slot: square media artwork, title, waveform, and hover playback. */
const ProfileMediaSlotCard = ({
	asset,
	onPlay,
	onDelete,
}: {
	asset: MediaAssetDto;
	onPlay: () => void;
	onDelete: () => void;
}) => {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const isAudio = asset.kind === 'audio';
	const displayTitle = getMediaDisplayTitle(asset.filename);

	const handleAudioToggle = async () => {
		const audio = audioRef.current;
		if (!audio || !asset.url) return;
		if (isPlaying) {
			audio.pause();
			return;
		}
		if (audio.ended) {
			audio.currentTime = 0;
		}
		try {
			await audio.play();
		} catch {
			setIsPlaying(false);
		}
	};

	const handleCardClick = () => {
		if (isAudio) {
			void handleAudioToggle();
			return;
		}
		onPlay();
	};

	const playOverlayClassName = isPlaying
		? 'opacity-100'
		: 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100';

	return (
		<div className="group relative h-[66px] w-[326px] shrink-0 overflow-hidden rounded-[9px] bg-[#F2F7FF]">
			<button
				type="button"
				onClick={handleCardClick}
				aria-label={`Play ${asset.filename}`}
				className="flex h-full w-full items-center gap-[13px] px-[12px] text-left transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
			>
				<span
					className="relative flex h-[50px] w-[50px] shrink-0 overflow-hidden rounded-[6px]"
					style={{
						background:
							'linear-gradient(145deg, #EF3030 0%, #F44458 36%, #F04CCB 72%, #FF64D8 100%)',
					}}
				>
					{asset.kind === 'video' && asset.posterUrl && (
						// eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL, not a static asset
						<img
							src={asset.posterUrl}
							alt=""
							className="h-full w-full object-cover"
						/>
					)}
					<span
						className={`absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity ${playOverlayClassName}`}
					>
						<span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-black/70 text-white">
							{isPlaying ? (
								<Pause className="h-3.5 w-3.5" />
							) : (
								<Play className="h-3.5 w-3.5 fill-white" />
							)}
						</span>
					</span>
				</span>
				<span className="flex min-w-0 flex-1 flex-col justify-center gap-[1px]">
					<span className="truncate font-inter text-[16px] font-medium leading-[19px] text-black">
						{displayTitle}
					</span>
					<ProfileMediaWaveform />
				</span>
			</button>
			{isAudio && asset.url && (
				<audio
					ref={audioRef}
					src={asset.url}
					preload="metadata"
					className="hidden"
					onPlay={() => setIsPlaying(true)}
					onPause={() => setIsPlaying(false)}
					onEnded={() => setIsPlaying(false)}
				/>
			)}
			<button
				type="button"
				onClick={onDelete}
				aria-label={`Remove ${asset.filename}`}
				className="absolute right-[6px] top-[6px] hidden h-[20px] w-[20px] items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 group-hover:flex"
			>
				<X className="h-3 w-3" />
			</button>
		</div>
	);
};

export const ProfileSidePanelBox = ({
	profileName,
	profileGenre,
	profileArea,
	profilePerformingName,
	profileBio,
	onProfileNameUpdate,
	onProfileGenreUpdate,
	onProfileAreaUpdate,
	onProfilePerformingNameUpdate,
	onProfileBioUpdate,
}: ProfileSidePanelBoxProps) => {
	const [isEditingName, setIsEditingName] = useState(false);
	const [nameDraft, setNameDraft] = useState('');
	const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
	const [selectedGenreDraft, setSelectedGenreDraft] = useState(
		() => profileGenre?.trim() || ''
	);
	const [isGenreChooserOpen, setIsGenreChooserOpen] = useState(
		() => !profileGenre?.trim()
	);
	const [selectedAreaDraft, setSelectedAreaDraft] = useState(
		() => profileArea?.trim() || ''
	);
	const [isAreaChooserOpen, setIsAreaChooserOpen] = useState(() => !profileArea?.trim());
	const [performingNameDraft, setPerformingNameDraft] = useState(
		() => profilePerformingName?.trim() || ''
	);
	const [isPerformingNameEditorOpen, setIsPerformingNameEditorOpen] = useState(
		() => !profilePerformingName?.trim()
	);
	const [bioDraft, setBioDraft] = useState(() => profileBio?.trim() || '');
	const [isBioEditorOpen, setIsBioEditorOpen] = useState(() => !profileBio?.trim());

	// Keep the draft in sync with the incoming name when not actively editing.
	useEffect(() => {
		if (!isEditingName) setNameDraft(profileName?.trim() || '');
	}, [profileName, isEditingName]);

	useEffect(() => {
		const nextGenre = profileGenre?.trim() || '';
		setSelectedGenreDraft(nextGenre);
		setIsGenreChooserOpen(!nextGenre);
	}, [profileGenre]);

	useEffect(() => {
		const nextArea = profileArea?.trim() || '';
		setSelectedAreaDraft(nextArea);
		setIsAreaChooserOpen(!nextArea);
	}, [profileArea]);

	useEffect(() => {
		const nextPerformingName = profilePerformingName?.trim() || '';
		setPerformingNameDraft(nextPerformingName);
		setIsPerformingNameEditorOpen(!nextPerformingName);
	}, [profilePerformingName]);

	useEffect(() => {
		const nextBio = profileBio?.trim() || '';
		setBioDraft(nextBio);
		setIsBioEditorOpen(!nextBio);
	}, [profileBio]);

	const effectiveName = (isEditingName ? nameDraft : profileName)?.trim() || '';
	const displayName = effectiveName || 'Profile';
	const displayInitial = displayName.charAt(0).toUpperCase();
	const isEditable = Boolean(onProfileNameUpdate);
	const selectedGenre = selectedGenreDraft;
	const selectedArea = selectedAreaDraft;
	const selectedPerformingName = performingNameDraft.trim();
	const selectedBio = bioDraft.trim();
	const selectedGenreOption = genreOptionRows
		.flat()
		.find((genre) => genre.label === selectedGenre);
	const SelectedGenreIcon = selectedGenreOption?.Icon;
	const isGenreEditable = Boolean(onProfileGenreUpdate);
	const showAreaStep = Boolean(selectedGenre);
	const hasCompletedArea = Boolean(showAreaStep && selectedArea);
	const showCompletedArea = Boolean(hasCompletedArea && !isAreaChooserOpen);
	const showAreaEditor = Boolean(
		showAreaStep && !isGenreChooserOpen && (!selectedArea || isAreaChooserOpen)
	);
	const showPerformingNameField = hasCompletedArea;
	const showCompletedPerformingName = Boolean(
		showPerformingNameField && selectedPerformingName && !isPerformingNameEditorOpen
	);
	const showPerformingNameEditor = Boolean(
		showPerformingNameField &&
		!isGenreChooserOpen &&
		!isAreaChooserOpen &&
		(!selectedPerformingName || isPerformingNameEditorOpen)
	);
	const showBioStep = Boolean(showPerformingNameField && selectedPerformingName);
	const showCompletedBio = Boolean(showBioStep && selectedBio && !isBioEditorOpen);
	const showBioEditor = Boolean(
		showBioStep &&
		!isGenreChooserOpen &&
		!isAreaChooserOpen &&
		!isPerformingNameEditorOpen &&
		(!selectedBio || isBioEditorOpen)
	);
	const showVideoVerificationSection = Boolean(
		showCompletedBio &&
		!isGenreChooserOpen &&
		!isAreaChooserOpen &&
		!isPerformingNameEditorOpen
	);

	// Profile media (video/audio) lives on the account and is fetched independently
	// of the campaign-scoped profile fields above.
	const mediaInputRef = useRef<HTMLInputElement>(null);
	const [previewAsset, setPreviewAsset] = useState<MediaAssetDto | null>(null);
	const { data: profileMedia = [] } = useGetMedia('profile_media');
	const { upload: uploadMedia, activeUploads } = useMediaUpload('profile_media');
	const deleteMedia = useDeleteMedia();

	const mediaSlots: Array<
		{ type: 'asset'; asset: MediaAssetDto } | { type: 'upload'; upload: UploadState }
	> = [
		...profileMedia.map((asset) => ({ type: 'asset' as const, asset })),
		...activeUploads.map((upload) => ({ type: 'upload' as const, upload })),
	];
	const canAddMedia = mediaSlots.length < 3;

	const handleSelectMediaFile = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (file) void uploadMedia(file);
	};

	// Profile photo (avatar) reuses the same media pipeline (context: "avatar", cap 1).
	const avatarInputRef = useRef<HTMLInputElement>(null);
	const { data: avatarMedia = [] } = useGetMedia('avatar');
	const { upload: uploadAvatar, activeUploads: avatarUploads } = useMediaUpload('avatar');
	const replaceAvatar = useDeleteMedia({ suppressToasts: true });
	const avatar = avatarMedia.find((item) => item.status === 'ready') ?? null;
	const isAvatarUploading = avatarUploads.length > 0;

	const handleSelectAvatarFile = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		// Avatar is capped at one — clear any existing avatar first so the new upload
		// isn't rejected by the per-context limit.
		await Promise.all(
			avatarMedia.map((item) => replaceAvatar.mutateAsync(item.id).catch(() => {}))
		);
		void uploadAvatar(file);
	};

	const startEditing = () => {
		if (!isEditable) return;
		setNameDraft(profileName?.trim() || '');
		setIsEditingName(true);
	};

	const commitName = () => {
		setIsEditingName(false);
		const next = nameDraft.trim();
		const prev = (profileName ?? '').trim();
		// Name is required on Identity; skip empty or unchanged values.
		if (!next || next === prev) {
			setNameDraft(prev);
			return;
		}
		onProfileNameUpdate?.(next);
	};

	const cancelEditing = () => {
		setNameDraft(profileName?.trim() || '');
		setIsEditingName(false);
	};

	const handleGenreClick = (genre: string) => {
		if (!isGenreEditable) return;
		const hasArea = Boolean(selectedArea);
		setSelectedGenreDraft(genre);
		setIsGenreChooserOpen(false);
		setIsAreaChooserOpen(!hasArea);
		setIsPerformingNameEditorOpen(hasArea && !selectedPerformingName);
		setIsBioEditorOpen(!selectedBio);
		if (genre !== selectedGenre) onProfileGenreUpdate?.(genre);
	};

	const openGenreChooser = () => {
		setIsGenreChooserOpen(true);
		setIsAreaChooserOpen(!selectedArea);
		setIsPerformingNameEditorOpen(!selectedPerformingName);
		setIsBioEditorOpen(!selectedBio);
	};

	const openAreaChooser = () => {
		setIsGenreChooserOpen(false);
		setIsAreaChooserOpen(true);
		setIsPerformingNameEditorOpen(!selectedPerformingName);
		setIsBioEditorOpen(!selectedBio);
	};

	const openPerformingNameEditor = () => {
		setIsGenreChooserOpen(false);
		setIsAreaChooserOpen(false);
		setIsPerformingNameEditorOpen(true);
		setIsBioEditorOpen(!selectedBio);
	};

	const openBioEditor = () => {
		setIsGenreChooserOpen(false);
		setIsAreaChooserOpen(false);
		setIsPerformingNameEditorOpen(false);
		setIsBioEditorOpen(true);
	};

	const handleAreaUpdate = (area: string) => {
		const next = area.trim();
		if (!next) return;
		setSelectedAreaDraft(next);
		setIsAreaChooserOpen(false);
		onProfileAreaUpdate?.(next);
	};

	const commitPerformingName = () => {
		const next = performingNameDraft.trim();
		const prev = (profilePerformingName ?? '').trim();
		setPerformingNameDraft(next);
		setIsPerformingNameEditorOpen(!next);
		if (next === prev) return;
		onProfilePerformingNameUpdate?.(next || null);
	};

	const cancelPerformingNameEdit = () => {
		const prev = profilePerformingName?.trim() || '';
		setPerformingNameDraft(prev);
		setIsPerformingNameEditorOpen(!prev);
	};

	const commitBio = () => {
		const next = bioDraft.trim();
		const prev = (profileBio ?? '').trim();
		setBioDraft(next);
		setIsBioEditorOpen(!next);
		if (next === prev) return;
		onProfileBioUpdate?.(next || null);
	};

	const cancelBioEdit = () => {
		const prev = profileBio?.trim() || '';
		setBioDraft(prev);
		setIsBioEditorOpen(!prev);
	};

	const nameClassName =
		'box-border inline-flex h-[22px] max-w-[215px] items-center justify-center truncate whitespace-nowrap rounded-[3px] bg-[#D6FFED] px-[8px] font-inter text-[17.507px] font-medium leading-[22px] text-black';

	return (
		<div
			data-campaign-profile-side-panel
			aria-label="Profile panel"
			className="relative box-border flex h-[681px] w-[393px] items-end justify-center rounded-[12px] border-[3px] border-[#070707] bg-[#75BEF9] pb-[5px]"
		>
			<span className="absolute left-[22px] top-[0px] font-inter text-[17.507px] font-medium leading-[23.342px] text-black">
				Profile
			</span>
			<div className="box-border flex h-[651px] w-[374px] flex-col overflow-hidden rounded-[12px] border-2 border-black bg-[#ABCBF9]">
				<div className="flex h-[53px] shrink-0 items-center gap-[9px] border-b-2 border-black bg-[#ABCBF9] pl-[23px]">
					<button
						type="button"
						onClick={() => avatarInputRef.current?.click()}
						aria-label="Upload a profile photo"
						className="relative flex h-[33px] w-[33px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#7BDB7F] font-inter text-[25px] font-normal leading-none text-white transition hover:brightness-95"
					>
						{avatar?.url ? (
							// eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL, not a static asset
							<img src={avatar.url} alt="" className="h-full w-full object-cover" />
						) : (
							displayInitial
						)}
						{isAvatarUploading && (
							<span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[12px]">
								…
							</span>
						)}
					</button>
					<input
						ref={avatarInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleSelectAvatarFile}
					/>
					{isEditingName ? (
						<input
							type="text"
							value={nameDraft}
							onChange={(e) => setNameDraft(e.target.value)}
							onBlur={commitName}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									commitName();
								} else if (e.key === 'Escape') {
									e.preventDefault();
									cancelEditing();
								}
							}}
							autoFocus
							className={`${nameClassName} w-[180px] justify-start border-0 outline-none`}
						/>
					) : isEditable ? (
						<button
							type="button"
							onClick={startEditing}
							aria-label={
								effectiveName
									? `Edit profile name: ${effectiveName}`
									: 'Edit profile name'
							}
							className={`${nameClassName} cursor-text transition hover:brightness-95`}
						>
							{displayName}
						</button>
					) : (
						<div className={nameClassName}>{displayName}</div>
					)}
					{profileSwatchColors.map((color) => (
						<div
							key={color}
							aria-hidden="true"
							className="box-border h-[21px] w-[21px] shrink-0 rounded-[2.86px] border-[0.782px] border-black opacity-50"
							style={{ backgroundColor: color }}
						/>
					))}
				</div>
				<div className="flex flex-1 items-center justify-center bg-[#F2F7FF]">
					<div className="box-border flex h-[578px] w-[352px] flex-col overflow-y-auto rounded-[9px] bg-white px-[9px] pt-[8px] pb-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						<ProfileFieldLabel completed={Boolean(selectedGenre)}>
							Genre
						</ProfileFieldLabel>
						{selectedGenreOption && !isGenreChooserOpen ? (
							<button
								type="button"
								disabled={!isGenreEditable}
								onClick={openGenreChooser}
								className="mt-[5px] flex h-[21.374px] appearance-none items-center justify-center gap-[3px] rounded-[7.491px] border-0 bg-[#F4F4F4] px-[4px] font-inter text-[14px] font-medium leading-[21.374px] text-black transition hover:brightness-95 disabled:cursor-default disabled:opacity-100"
								style={{ width: `${selectedGenreOption.width}px` }}
							>
								{SelectedGenreIcon && (
									<SelectedGenreIcon aria-hidden="true" className="shrink-0" />
								)}
								<span>{selectedGenreOption.label}</span>
							</button>
						) : (
							<div className="relative mt-[5px] box-border h-[129px] w-[334px] shrink-0 overflow-hidden rounded-[9px] border-[1.526px] border-black bg-white opacity-80">
								<div className="box-border flex h-[27px] items-center px-[10px] font-inter text-[17.507px] font-medium leading-[23.342px] text-black">
									Choose your Genre
								</div>
								<div className="absolute inset-x-0 bottom-0 top-[27px] bg-[#BAD4FA]" />
								<div className="absolute left-0 top-[27px] w-full border-t-[1.526px] border-black" />
								<div className="absolute left-[11px] right-[11px] top-[37px] flex flex-col gap-[9px]">
									{genreOptionRows.map((row) => (
										<div
											key={row.map((genre) => genre.label).join('-')}
											className="flex justify-between"
										>
											{row.map((genre) => {
												const Icon = genre.Icon;
												const isSelected = genre.label === selectedGenre;
												const isHovered = genre.label === hoveredGenre;

												return (
													<button
														type="button"
														key={genre.label}
														disabled={!isGenreEditable}
														onClick={() => handleGenreClick(genre.label)}
														onMouseEnter={() => setHoveredGenre(genre.label)}
														onMouseLeave={() => setHoveredGenre(null)}
														className={`flex h-[21.374px] appearance-none items-center justify-center gap-[3px] rounded-[7.491px] border-0 px-[4px] font-inter text-[14px] font-medium leading-[21.374px] text-black transition-colors disabled:opacity-100 ${
															isGenreEditable ? 'cursor-pointer' : 'cursor-default'
														} ${isSelected || isHovered ? 'bg-[#D6FFED]' : 'bg-white'}`}
														style={{ width: `${genre.width}px` }}
													>
														{Icon && <Icon aria-hidden="true" className="shrink-0" />}
														<span>{genre.label}</span>
													</button>
												);
											})}
										</div>
									))}
								</div>
							</div>
						)}
						<ProfileFieldLabel
							completed={Boolean(selectedArea)}
							className={showAreaStep ? 'mt-[14px]' : 'mt-[39px]'}
						>
							Area
						</ProfileFieldLabel>
						{showCompletedArea ? (
							<button
								type="button"
								onClick={openAreaChooser}
								className="mt-[5px] flex h-[21.374px] w-fit max-w-[334px] appearance-none items-center gap-[4px] overflow-hidden rounded-[7.491px] border-0 bg-[#F4F4F4] px-[6px] font-inter text-[14px] font-medium leading-[21.374px] text-black transition hover:brightness-95"
							>
								<span
									aria-hidden="true"
									className="block h-[16px] w-[13px] shrink-0"
									dangerouslySetInnerHTML={{ __html: profileAreaMarkerSvg }}
								/>
								<span className="min-w-0 truncate">{selectedArea}</span>
							</button>
						) : showAreaEditor ? (
							<ProfileAreaMapBox area={selectedArea} onAreaUpdate={handleAreaUpdate} />
						) : null}
						<ProfileFieldLabel
							completed={Boolean(selectedPerformingName)}
							className={showAreaStep ? 'mt-[14px]' : 'mt-[35px]'}
						>
							Performing Name
						</ProfileFieldLabel>
						{showCompletedPerformingName ? (
							<button
								type="button"
								onClick={openPerformingNameEditor}
								className="mt-[5px] flex h-[21.374px] w-fit max-w-[334px] appearance-none items-center gap-[4px] overflow-hidden rounded-[7.491px] border-0 bg-[#F4F4F4] px-[6px] font-inter text-[14px] font-medium leading-[21.374px] text-black transition hover:brightness-95"
							>
								<span
									aria-hidden="true"
									className="block h-[16px] w-[16px] shrink-0"
									dangerouslySetInnerHTML={{ __html: profilePerformingNameIconSvg }}
								/>
								<span className="min-w-0 truncate">{selectedPerformingName}</span>
							</button>
						) : showPerformingNameEditor ? (
							<textarea
								value={performingNameDraft}
								onChange={(event) => setPerformingNameDraft(event.target.value)}
								onBlur={commitPerformingName}
								onKeyDown={(event) => {
									if (event.key === 'Escape') {
										event.preventDefault();
										cancelPerformingNameEdit();
									}
								}}
								rows={2}
								autoFocus
								aria-label="Performing name"
								className="mt-[9px] box-border h-[50px] w-[301px] shrink-0 resize-none rounded-[9px] border-[1.526px] border-black bg-white px-[14px] py-[4px] font-inter text-[18px] font-medium leading-[20px] text-black opacity-80 outline-none"
							/>
						) : null}
						<ProfileFieldLabel completed={Boolean(selectedBio)} className="mt-[16px]">
							Bio
						</ProfileFieldLabel>
						{showCompletedBio ? (
							<button
								type="button"
								onClick={openBioEditor}
								className="mt-[5px] flex h-[81px] w-[326px] appearance-none items-start gap-[9px] overflow-hidden rounded-[9px] border-0 bg-[#F4F4F4] px-[10px] py-[9px] text-left font-inter text-[13px] font-medium leading-[16px] text-black transition hover:brightness-95"
							>
								<span
									aria-hidden="true"
									className="mt-[1px] block h-[17px] w-[8px] shrink-0"
									dangerouslySetInnerHTML={{ __html: profileBioIconSvg }}
								/>
								<span className="line-clamp-3 min-w-0 whitespace-normal">
									{selectedBio}
								</span>
							</button>
						) : showBioEditor ? (
							<textarea
								value={bioDraft}
								onChange={(event) => setBioDraft(event.target.value)}
								onBlur={commitBio}
								onKeyDown={(event) => {
									if (event.key === 'Escape') {
										event.preventDefault();
										cancelBioEdit();
									}
								}}
								autoFocus={!selectedBio}
								aria-label="Bio"
								className="ml-[27px] mt-[24px] h-[132px] w-[301px] resize-none border-0 bg-transparent p-0 font-inter text-[18px] font-medium leading-[24px] text-black outline-none"
							/>
						) : null}
						{showVideoVerificationSection && (
							<>
								<div className="ml-[26px] mt-[20px] w-[236px] font-inter text-[10.5px] font-normal italic leading-[15px] text-black">
									Add a video or audio clip to verify your account and improve your
									profile
								</div>
								<input
									ref={mediaInputRef}
									type="file"
									accept="video/*,audio/*"
									className="hidden"
									onChange={handleSelectMediaFile}
								/>
								<div className="mt-[24px] flex flex-col items-center gap-[14px]">
									{[0, 1, 2].map((index) => {
										const slot = mediaSlots[index];

										if (slot?.type === 'asset' && slot.asset.status === 'ready') {
											const asset = slot.asset;
											return (
												<ProfileMediaSlotCard
													key={asset.id}
													asset={asset}
													onPlay={() => setPreviewAsset(asset)}
													onDelete={() => deleteMedia.mutate(asset.id)}
												/>
											);
										}

										if (slot?.type === 'asset') {
											const asset = slot.asset;
											return (
												<div
													key={asset.id}
													className="relative flex h-[66px] w-[326px] shrink-0 items-center justify-center rounded-[9px] bg-[#F2F7FF] font-inter text-[11px] text-black/50"
												>
													{asset.status === 'failed' ? 'Upload failed' : 'Processing…'}
													<button
														type="button"
														onClick={() => deleteMedia.mutate(asset.id)}
														aria-label="Remove"
														className="absolute right-[6px] top-[6px] flex h-[20px] w-[20px] items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
													>
														<X className="h-3 w-3" />
													</button>
												</div>
											);
										}

										if (slot?.type === 'upload') {
											return (
												<div
													key={`upload-${index}`}
													className="flex h-[66px] w-[326px] shrink-0 flex-col items-center justify-center gap-[8px] rounded-[9px] bg-[#F2F7FF] px-[16px]"
												>
													<span className="w-full truncate text-center font-inter text-[11px] text-black/70">
														{slot.upload.filename}
													</span>
													<div className="h-[4px] w-full overflow-hidden rounded-full bg-black/10">
														<div
															className="h-full rounded-full bg-[#7BDB7F] transition-[width] duration-200"
															style={{ width: `${slot.upload.progress}%` }}
														/>
													</div>
												</div>
											);
										}

										if (index === mediaSlots.length && canAddMedia) {
											return (
												<button
													key={`add-${index}`}
													type="button"
													onClick={() => mediaInputRef.current?.click()}
													aria-label="Add a video or audio clip"
													className="relative h-[66px] w-[326px] shrink-0 rounded-[9px] bg-[#F2F7FF] transition hover:brightness-95"
												>
													<span
														className="absolute left-1/2 top-1/2 block h-[17px] w-[17px] -translate-x-1/2 -translate-y-1/2"
														dangerouslySetInnerHTML={{ __html: profileVideoAddIconSvg }}
													/>
												</button>
											);
										}

										return (
											<div
												key={`empty-${index}`}
												aria-hidden="true"
												className="h-[66px] w-[326px] shrink-0 rounded-[9px] bg-[#F2F7FF]"
												style={{ opacity: [1, 0.8, 0.5][index] }}
											/>
										);
									})}
								</div>
								<MediaPreviewDialog
									asset={previewAsset}
									open={Boolean(previewAsset)}
									onOpenChange={(open) => {
										if (!open) setPreviewAsset(null);
									}}
								/>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
