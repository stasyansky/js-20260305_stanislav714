type DoubleSliderSelected = {
  from: number;
  to: number;
};

interface Options {
  min?: number;
  max?: number;
  formatValue?: (value: number) => string;
  selected?: DoubleSliderSelected;
}

type SubElementName = 'from' | 'to' | 'inner' | 'progress' | 'thumbLeft' | 'thumbRight';
type SubElements = Partial<Record<SubElementName, HTMLElement>>;
type DragTarget = 'left' | 'right' | null;

export default class DoubleSlider {
  element: HTMLElement | null = null;
  min: number;
  max: number;

  private formatValue: (value: number) => string;
  private selected: DoubleSliderSelected;
  private subElements: SubElements = {};
  private dragTarget: DragTarget = null;

  constructor({
    min = 10,
    max = 100,
    formatValue = (value: number) => `$${value}`,
    selected
  }: Options = {}) {
    this.min = Math.min(min, max);
    this.max = Math.max(min, max);
    this.formatValue = formatValue;
    this.selected = this.normalizeSelected(selected);

    this.render();
    this.addEventListeners();
    this.update();
  }

  private normalizeSelected(selected?: DoubleSliderSelected): DoubleSliderSelected {
    if (!selected) {
      return { from: this.min, to: this.max };
    }

    const from = Math.max(this.min, Math.min(selected.from, this.max));
    const to = Math.max(this.min, Math.min(selected.to, this.max));

    return {
      from: Math.min(from, to),
      to: Math.max(from, to)
    };
  }

  private render(): void {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.template;

    this.element = wrapper.firstElementChild as HTMLElement;
    this.subElements = this.getSubElements(this.element);
  }

  private get template(): string {
    return `
      <div class="range-slider">
        <span data-element="from"></span>
        <div class="range-slider__inner" data-element="inner">
          <span class="range-slider__progress" data-element="progress"></span>
          <span class="range-slider__thumb-left" data-element="thumbLeft"></span>
          <span class="range-slider__thumb-right" data-element="thumbRight"></span>
        </div>
        <span data-element="to"></span>
      </div>
    `;
  }

  private getSubElements(element: HTMLElement): SubElements {
    const subElements: SubElements = {};
    const elements = element.querySelectorAll<HTMLElement>('[data-element]');

    for (const subElement of elements) {
      const key = subElement.dataset.element as SubElementName;
      subElements[key] = subElement;
    }

    return subElements;
  }

  private addEventListeners(): void {
    this.subElements.thumbLeft?.addEventListener('pointerdown', this.onLeftThumbPointerDown);
    this.subElements.thumbRight?.addEventListener('pointerdown', this.onRightThumbPointerDown);
  }

  private removeEventListeners(): void {
    this.subElements.thumbLeft?.removeEventListener('pointerdown', this.onLeftThumbPointerDown);
    this.subElements.thumbRight?.removeEventListener('pointerdown', this.onRightThumbPointerDown);
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
  }

  private onLeftThumbPointerDown = (event: Event): void => {
    this.startDrag('left', event as PointerEvent);
  };

  private onRightThumbPointerDown = (event: Event): void => {
    this.startDrag('right', event as PointerEvent);
  };

  private startDrag(target: DragTarget, event: PointerEvent): void {
    event.preventDefault();
    this.dragTarget = target;
    this.element?.classList.add('range-slider_dragging');
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
  }

  private onPointerMove = (event: Event): void => {
    if (!this.dragTarget) {
      return;
    }

    const inner = this.subElements.inner;

    if (!inner) {
      return;
    }

    const { left, width } = inner.getBoundingClientRect();

    if (width <= 0) {
      return;
    }

    const pointer = event as PointerEvent;
    const pointerPosition = this.clamp((pointer.clientX - left) / width, 0, 1);
    const leftPercent = this.getLeftPercent();
    const rightPercent = this.getRightPercent();
    const range = this.max - this.min;

    if (this.dragTarget === 'left') {
      const newLeftPercent = Math.min(pointerPosition * 100, 100 - rightPercent);
      const from = range === 0
        ? this.min
        : this.min + (range * newLeftPercent) / 100;

      this.selected.from = Math.round(from);
    } else {
      const newRightPercent = Math.min((1 - pointerPosition) * 100, 100 - leftPercent);
      const to = range === 0
        ? this.max
        : this.max - (range * newRightPercent) / 100;

      this.selected.to = Math.round(to);
    }

    this.update();
  };

  private onPointerUp = (): void => {
    if (!this.dragTarget) {
      return;
    }

    this.dragTarget = null;
    this.element?.classList.remove('range-slider_dragging');
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);

    this.element?.dispatchEvent(new CustomEvent('range-select', {
      detail: {
        from: this.selected.from,
        to: this.selected.to
      }
    }));
  };

  private update(): void {
    if (!this.element) {
      return;
    }

    if (this.max === this.min) {
      this.selected = { from: this.min, to: this.max };
    }

    const from = this.subElements.from;
    const to = this.subElements.to;
    const progress = this.subElements.progress;
    const thumbLeft = this.subElements.thumbLeft;
    const thumbRight = this.subElements.thumbRight;
    const leftPercent = this.getLeftPercent();
    const rightPercent = this.getRightPercent();

    if (from) {
      from.textContent = this.formatValue(this.selected.from);
    }

    if (to) {
      to.textContent = this.formatValue(this.selected.to);
    }

    if (progress) {
      progress.style.left = `${leftPercent}%`;
      progress.style.right = `${rightPercent}%`;
    }

    if (thumbLeft) {
      thumbLeft.style.left = `${leftPercent}%`;
    }

    if (thumbRight) {
      thumbRight.style.right = `${rightPercent}%`;
    }
  }

  private getLeftPercent(): number {
    const range = this.max - this.min;

    if (range <= 0) {
      return 0;
    }

    return ((this.selected.from - this.min) / range) * 100;
  }

  private getRightPercent(): number {
    const range = this.max - this.min;

    if (range <= 0) {
      return 0;
    }

    return ((this.max - this.selected.to) / range) * 100;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  destroy(): void {
    this.removeEventListeners();
    this.element?.remove();
    this.element = null;
    this.subElements = {};
  }
}
