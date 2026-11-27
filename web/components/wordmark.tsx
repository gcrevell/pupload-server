import { useId } from 'preact/hooks'

export function Wordmark() {
  const arrowMask = useId()
  return (
    <span class="wordmark">
      <span class="wordmark-tile" aria-hidden="true">
        <svg viewBox="0 0 1024 1024">
          <mask id={arrowMask}>
            <rect width="1024" height="1024" fill="#fff" />
            <path d="M512 740 L512 606 M454 662 L512 604 L570 662" fill="none" stroke="#000" stroke-width="44" stroke-linecap="round" stroke-linejoin="round" />
          </mask>
          <g fill="currentColor">
            <path mask={`url(#${arrowMask})`} d="M512 494 C594 494 652 574 684 644 C716 714 684 790 612 790 C570 790 548 770 512 770 C476 770 454 790 412 790 C340 790 308 714 340 644 C372 574 430 494 512 494 Z" />
            <ellipse cx="300" cy="468" rx="62" ry="80" transform="rotate(-28 300 468)" />
            <ellipse cx="724" cy="468" rx="62" ry="80" transform="rotate(28 724 468)" />
            <ellipse cx="428" cy="322" rx="66" ry="88" transform="rotate(-10 428 322)" />
            <ellipse cx="596" cy="322" rx="66" ry="88" transform="rotate(10 596 322)" />
          </g>
        </svg>
      </span>
      Pupload
    </span>
  )
}
