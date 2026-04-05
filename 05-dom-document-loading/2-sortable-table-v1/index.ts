import { createElement } from "../../shared/utils/create-element";

type SortOrder = 'asc' | 'desc';

type SortableTableData = Record<string, string | number>;

interface SortableTableHeader {
  id: string;
  title: string;
  sortable?: boolean;
  sortType?: 'string' | 'number';
  template?: (value: string | number) => string;
}

type SubElements = {
  body: HTMLElement;
};

export default class SortableTable {
  element: HTMLElement | null = null;
  private subElements: Partial<SubElements> = {};
  private data: SortableTableData[] = [];

  constructor(private headersConfig: SortableTableHeader[] = [], data: SortableTableData[] = []) {
    this.data = [...data];
    this.render();
  }

  private render(): void {
    this.element = createElement(this.template);
    this.subElements = this.getSubElements(this.element);
  }

  private get template(): string {
    return `
      <div class="sortable-table">
        <div data-element="header" class="sortable-table__header sortable-table__row">
          ${this.getTableHeaderTemplate()}
        </div>
        <div data-element="body" class="sortable-table__body">
          ${this.getTableBodyTemplate(this.data)}
        </div>
        <div data-element="loading" class="loading-line sortable-table__loading-line"></div>
        <div data-element="emptyPlaceholder" class="sortable-table__empty-placeholder">
          <div>
            <p>No products satisfies your filter criteria</p>
            <button type="button" class="button-primary-outline">Reset all filters</button>
          </div>
        </div>
      </div>
    `;
  }

  private getTableHeaderTemplate(): string {
    return this.headersConfig
      .map(({ id, title, sortable = false }) => {
        const sortableArrow = sortable
          ? `
            <span data-element="arrow" class="sortable-table__sort-arrow">
              <span class="sort-arrow"></span>
            </span>
          `
          : '';

        return `
          <div class="sortable-table__cell" data-id="${id}" data-sortable="${sortable}">
            <span>${title}</span>
            ${sortableArrow}
          </div>
        `;
      })
      .join('');
  }

  private getTableBodyTemplate(data: SortableTableData[]): string {
    return data
      .map(item => {
        const cells = this.headersConfig
          .map(({ id, template }) => {
            const cellValue = item[id];

            if (template) {
              return template(cellValue);
            }

            return `<div class="sortable-table__cell">${cellValue ?? ''}</div>`;
          })
          .join('');

        return `
          <a href="/products/${item.id}" class="sortable-table__row">
            ${cells}
          </a>
        `;
      })
      .join('');
  }

  private getSubElements(element: HTMLElement): Partial<SubElements> {
    const body = element.querySelector<HTMLElement>('[data-element="body"]');

    if (!body) {
      return {};
    }

    return { body };
  }

  private updateHeaderSortingState(field: string, order: SortOrder): void {
    if (!this.element) {
      return;
    }

    const headerCells = this.element.querySelectorAll<HTMLElement>('.sortable-table__cell[data-id]');

    for (const headerCell of headerCells) {
      if (headerCell.dataset.id === field) {
        headerCell.dataset.order = order;
      } else {
        delete headerCell.dataset.order;
      }
    }
  }

  private compareValues(
    firstValue: string | number,
    secondValue: string | number,
    sortType: 'string' | 'number',
    order: SortOrder
  ): number {
    const direction = order === 'asc' ? 1 : -1;

    if (sortType === 'number') {
      return direction * (Number(firstValue) - Number(secondValue));
    }

    return direction * String(firstValue).localeCompare(
      String(secondValue),
      ['ru', 'en'],
      { caseFirst: 'upper' }
    );
  }

  sort(field: string, order: SortOrder = 'asc'): void {
    const sortingColumn = this.headersConfig.find(column => column.id === field);
    const body = this.subElements.body;

    if (!sortingColumn || !sortingColumn.sortable || !body) {
      return;
    }

    this.updateHeaderSortingState(field, order);

    const sortedData = [...this.data].sort((firstItem, secondItem) => {
      return this.compareValues(
        firstItem[field],
        secondItem[field],
        sortingColumn.sortType ?? 'string',
        order
      );
    });

    this.data = sortedData;
    body.innerHTML = this.getTableBodyTemplate(sortedData);
  }

  remove(): void {
    this.element?.remove();
  }

  destroy(): void {
    this.remove();
    this.element = null;
    this.subElements = {};
    this.data = [];
    this.headersConfig = [];
  }
}
