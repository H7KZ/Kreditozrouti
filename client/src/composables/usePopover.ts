import { computed, type Ref } from 'vue'

export interface PopoverPosition {
	x: number
	y: number
}

export interface PopoverDimensions {
	width: number
	height: number
}

export interface UsePopoverOptions {
	/** Popover width in pixels */
	width?: number
	/** Popover height in pixels */
	height?: number
	/** Margin from viewport edges in pixels */
	margin?: number
}

/**
 * Popover positioning composable.
 *
 * @example
 * ```ts
 * const { popoverStyle } = usePopover(position, {
 *   width: 280,
 *   height: 140,
 *   margin: 16,
 * })
 * ```
 */
export function usePopover(position: Ref<PopoverPosition>, options: UsePopoverOptions = {}) {
	const { width: popoverWidth = 280, height: popoverHeight = 140, margin = 16 } = options

	/**
	 * Calculate popover position with viewport bounds checking.
	 */
	const popoverStyle = computed(() => {
		let x = position.value.x
		let y = position.value.y

		// Adjust X if overflowing right
		if (x + popoverWidth + margin > window.innerWidth) {
			x = window.innerWidth - popoverWidth - margin
		}

		// Adjust Y if overflowing bottom
		if (y + popoverHeight + margin > window.innerHeight) {
			y = y - popoverHeight - 10
		}

		return {
			left: `${Math.max(margin, x)}px`,
			top: `${Math.max(margin, y)}px`,
		}
	})

	/**
	 * Check if popover would overflow viewport.
	 */
	function wouldOverflow(pos: PopoverPosition): { x: boolean; y: boolean } {
		return {
			x: pos.x + popoverWidth + margin > window.innerWidth,
			y: pos.y + popoverHeight + margin > window.innerHeight,
		}
	}

	/**
	 * Calculate best position for popover relative to an element.
	 */
	function calculatePosition(element: HTMLElement, preferredPosition: 'above' | 'below' | 'left' | 'right' = 'below'): PopoverPosition {
		const rect = element.getBoundingClientRect()

		switch (preferredPosition) {
			case 'above':
				return {
					x: rect.left + rect.width / 2 - popoverWidth / 2,
					y: rect.top - popoverHeight - 10,
				}
			case 'below':
				return {
					x: rect.left + rect.width / 2 - popoverWidth / 2,
					y: rect.bottom + 10,
				}
			case 'left':
				return {
					x: rect.left - popoverWidth - 10,
					y: rect.top + rect.height / 2 - popoverHeight / 2,
				}
			case 'right':
				return {
					x: rect.right + 10,
					y: rect.top + rect.height / 2 - popoverHeight / 2,
				}
		}
	}

	return {
		popoverStyle,
		wouldOverflow,
		calculatePosition,
		popoverWidth,
		popoverHeight,
		margin,
	}
}
