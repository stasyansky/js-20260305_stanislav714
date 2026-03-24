import { createElement } from "../../shared/utils/create-element";

interface ChartOptions {
  data: number[];
  label: string;
  value: number;
  link: string;
  formatHeading: (value: number) => string;
}

type Options = Partial<ChartOptions>;

const DEFAULT_OPTIONS: ChartOptions = {
  data: [],
  label: '',
  value: 0,
  link: '',
  formatHeading: value => String(value)
};

export default class ColumnChart {
  element!: HTMLElement;
  chartHeight = 50;
  subElements: Record<string, HTMLElement> = {};

  private config: ChartOptions;

  constructor(options: Options = {}) {
    this.config = { ...DEFAULT_OPTIONS, ...options };
    this.render();
    this.update(this.config.data);
  }

  private get template(): string {
    const { label, link, value, formatHeading } = this.config;

    return `
      <div class="column-chart" style="--chart-height: ${this.chartHeight}">
        <div class="column-chart__title">
          ${label}
          ${link ? `<a href="${link}" class="column-chart__link">View all</a>` : ''}
        </div>
        <div class="column-chart__container">
          <div data-element="header" class="column-chart__header">${formatHeading(value)}</div>
          <div data-element="body" class="column-chart__chart"></div>
        </div>
      </div>
    `;
  }

  private render(): void {
    this.element = createElement(this.template);
    this.subElements = this.getSubElements(this.element);
  }

  private getSubElements(element: HTMLElement): Record<string, HTMLElement> {
    return Array
      .from(element.querySelectorAll<HTMLElement>('[data-element]'))
      .reduce((acc, subElement) => {
        const key = subElement.dataset.element;

        if (key) {
          acc[key] = subElement;
        }

        return acc;
      }, {} as Record<string, HTMLElement>);
  }

  private getColumns(data: number[]): string {
    if (!data.length) {
      return '';
    }

    const maxValue = Math.max(...data);

    if (maxValue <= 0) {
      return data.map(() => (
        `<div style="--value: 0" data-tooltip="0%"></div>`
      )).join('');
    }

    const scale = this.chartHeight / maxValue;

    return data.map(item => `
      <div
        style="--value: ${Math.floor(item * scale)}"
        data-tooltip="${(item / maxValue * 100).toFixed(0)}%"
      ></div>
    `).join('');
  }

  update(data: number[] = []): void {
    this.config.data = data;
    this.element.classList.toggle('column-chart_loading', data.length === 0);
    this.subElements.body.innerHTML = this.getColumns(data);
  }

  remove(): void {
    this.element.remove();
  }

  destroy(): void {
    this.remove();
    this.subElements = {};
  }
}
