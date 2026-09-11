import { Link } from 'react-router-dom';

export function LogoMark({
  size = 38,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="Bulion"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M 246.0 104.5 L 246.0 135.5 L 238.0 136.5 L 224.0 141.0 L 211.0 147.5 L 200.0 155.0 L 187.5 167.0 L 181.5 174.5 L 175.5 184.0 L 169.5 197.0 L 166.0 209.0 L 164.0 221.0 L 164.0 238.0 L 165.5 248.0 L 169.0 261.0 L 174.5 274.0 L 182.5 287.0 L 190.0 296.0 L 171.0 314.5 L 169.0 315.0 L 159.0 303.0 L 148.0 285.0 L 142.0 271.0 L 137.0 253.5 L 134.5 236.0 L 134.5 221.0 L 137.0 203.0 L 142.5 184.5 L 151.5 165.5 L 160.5 152.0 L 170.5 140.5 L 183.5 129.0 L 198.5 119.0 L 209.5 113.5 L 224.5 108.0 L 237.0 105.0 L 246.0 104.0 Z M 274.5 104.0 L 286.0 105.5 L 306.0 111.5 L 322.0 119.0 L 335.5 128.0 L 345.5 136.5 L 359.5 152.0 L 370.0 168.5 L 377.5 185.0 L 382.5 203.0 L 384.5 216.5 L 384.5 238.0 L 382.5 252.0 L 378.0 268.5 L 370.0 287.0 L 361.5 301.0 L 350.0 315.0 L 329.0 295.5 L 337.0 286.0 L 343.0 276.5 L 348.5 265.0 L 352.5 252.0 L 355.0 236.5 L 355.0 220.0 L 353.5 210.0 L 350.5 199.0 L 346.0 188.0 L 339.0 176.0 L 332.0 167.0 L 322.0 157.0 L 310.5 148.5 L 298.5 142.0 L 284.5 137.0 L 274.0 135.0 L 274.0 104.0 Z M 260.0 178.0 L 272.5 230.0 L 282.0 262.5 L 293.5 288.0 L 303.0 304.0 L 310.5 314.5 L 328.0 333.5 L 342.5 337.5 L 362.0 345.0 L 376.0 352.0 L 390.5 361.0 L 408.5 375.5 L 423.0 391.5 L 408.5 384.0 L 388.0 375.0 L 357.0 365.0 L 322.5 358.0 L 296.0 355.5 L 282.0 309.0 L 273.0 273.5 L 268.5 251.0 L 263.5 251.0 L 263.0 255.0 L 269.0 322.0 L 277.0 387.5 L 242.5 387.5 L 251.0 318.0 L 256.5 257.5 L 256.5 251.5 L 251.5 251.0 L 238.5 305.0 L 223.5 355.5 L 189.5 359.0 L 155.5 366.5 L 124.0 377.5 L 95.5 391.5 L 101.5 384.0 L 111.0 374.5 L 128.0 361.0 L 155.5 345.5 L 174.5 338.0 L 191.0 333.5 L 202.5 322.0 L 209.5 313.5 L 225.5 289.0 L 238.5 260.0 L 250.0 219.5 L 260.0 178.0 Z"
      />
    </svg>
  );
}

export function Logo({
  compact = false,
  size = 60,
}: {
  compact?: boolean;
  size?: number;
}) {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 group shrink-0"
      aria-label="Bulion home"
    >
      <LogoMark size={size} className="text-white" />
      {!compact && (
        <span className="text-[22px] font-extrabold tracking-[-0.04em] leading-none text-white">
          Bulion
        </span>
      )}
    </Link>
  );
}

export default Logo;
