import * as React from "react"

function SvgComponent(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={123}
      height={91}
      viewBox="0 0 123 91"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        x={2.32256}
        y={15.3226}
        width={106.787}
        height={73.3578}
        rx={2.32145}
        fill="#CCDFF4"
        stroke="#000"
        strokeWidth={2.78574}
      />
      <path
        d="M55.94 48.43a.465.465 0 01.577.005l49.004 39.42a.464.464 0 01-.292.825H5.423a.464.464 0 01-.284-.831l50.801-39.42z"
        stroke="#000"
        strokeWidth={2.78574}
      />
      <path
        d="M56.65 56.416a.464.464 0 01-.6.006L7.622 16.145a.464.464 0 01.297-.822h94.82c.43 0 .628.533.304.815L56.65 56.416z"
        fill="#CCDFF4"
        stroke="#000"
        strokeWidth={2.78574}
      />
      <path
        d="M108.174 28.786c7.949 0 14.393-6.444 14.393-14.393C122.567 6.444 116.123 0 108.174 0c-7.949 0-14.393 6.444-14.393 14.393 0 7.949 6.444 14.393 14.393 14.393z"
        fill="#071525"
      />
      <path
        d="M106.843 25.234V9.397h-4.695V6.858c3.047-.47 4.03-1.052 5.318-2.213h2.743v20.59h-3.371.005z"
        fill="#fff"
      />
    </svg>
  )
}

export default SvgComponent
