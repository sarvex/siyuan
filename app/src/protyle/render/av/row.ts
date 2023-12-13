import {hasClosestBlock, hasClosestByClassName} from "../../util/hasClosest";
import {focusBlock} from "../../util/selection";
import {Menu} from "../../../plugin/Menu";
import {transaction} from "../../wysiwyg/transaction";

export const selectRow = (checkElement: Element, type: "toggle" | "select" | "unselect" | "unselectAll") => {
    const rowElement = hasClosestByClassName(checkElement, "av__row");
    if (!rowElement) {
        return;
    }
    const useElement = checkElement.querySelector("use");
    if (rowElement.classList.contains("av__row--header") || type === "unselectAll") {
        if ("#iconCheck" === useElement.getAttribute("xlink:href")) {
            rowElement.parentElement.querySelectorAll(".av__firstcol").forEach(item => {
                item.querySelector("use").setAttribute("xlink:href", "#iconUncheck");
                const rowItemElement = hasClosestByClassName(item, "av__row");
                if (rowItemElement) {
                    rowItemElement.classList.remove("av__row--select");
                }
            });
        } else {
            rowElement.parentElement.querySelectorAll(".av__firstcol").forEach(item => {
                item.querySelector("use").setAttribute("xlink:href", "#iconCheck");
                const rowItemElement = hasClosestByClassName(item, "av__row");
                if (rowItemElement) {
                    rowItemElement.classList.add("av__row--select");
                }
            });
        }
    } else {
        if (type === "select" || (useElement.getAttribute("xlink:href") === "#iconUncheck" && type === "toggle")) {
            rowElement.classList.add("av__row--select");
            useElement.setAttribute("xlink:href", "#iconCheck");
        } else if (type === "unselect" || (useElement.getAttribute("xlink:href") === "#iconCheck" && type === "toggle")) {
            rowElement.classList.remove("av__row--select");
            useElement.setAttribute("xlink:href", "#iconUncheck");
        }
    }
    focusBlock(hasClosestBlock(rowElement) as HTMLElement);
    updateHeader(rowElement);
};

export const updateHeader = (rowElement: HTMLElement) => {
    const blockElement = hasClosestBlock(rowElement);
    if (!blockElement) {
        return;
    }
    const selectCount = rowElement.parentElement.querySelectorAll(".av__row--select:not(.av__row--header)").length;
    const diffCount = rowElement.parentElement.childElementCount - 3 - selectCount;
    const headElement = rowElement.parentElement.firstElementChild;
    const headUseElement = headElement.querySelector("use");
    const counterElement = blockElement.querySelector(".av__counter");
    const avHeadElement = blockElement.querySelector(".av__header") as HTMLElement;
    if (diffCount === 0 && rowElement.parentElement.childElementCount - 3 !== 0) {
        headElement.classList.add("av__row--select");
        headUseElement.setAttribute("xlink:href", "#iconCheck");
    } else if (diffCount === rowElement.parentElement.childElementCount - 3) {
        headElement.classList.remove("av__row--select");
        headUseElement.setAttribute("xlink:href", "#iconUncheck");
        counterElement.classList.add("fn__none");
        avHeadElement.style.position = "";
        return;
    } else if (diffCount > 0) {
        headElement.classList.add("av__row--select");
        headUseElement.setAttribute("xlink:href", "#iconIndeterminateCheck");
    }
    counterElement.classList.remove("fn__none");
    counterElement.innerHTML = `${selectCount} selected`;
    avHeadElement.style.position = "sticky";
};

export const insertAttrViewBlockAnimation = (blockElement: Element, srcIDs: string[], previousId: string, avId?: string,) => {
    const previousElement = blockElement.querySelector(`.av__row[data-id="${previousId}"]`) || blockElement.querySelector(".av__row--header");
    let colHTML = '<div style="width: 24px"></div>';
    const pinIndex = previousElement.querySelectorAll(".av__colsticky .av__cell").length - 1;
    if (pinIndex > -1) {
        colHTML = '<div class="av__colsticky"><div style="width: 24px"></div>';
    }
    previousElement.querySelectorAll(".av__cell").forEach((item: HTMLElement, index) => {
        colHTML += `<div class="av__cell" style="width: ${item.style.width}" ${(item.getAttribute("data-block-id") || item.dataset.dtype === "block") ? ' data-detached="true"' : ""}><span class="av__pulse"></span></div>`;
        if (pinIndex === index) {
            colHTML += "</div>";
        }
    });

    let html = "";
    srcIDs.forEach((id) => {
        html += `<div class="av__row" data-id="${id}" data-avid="${avId}" data-previous-id="${previousId}">
    ${colHTML}
</div>`;
    });
    previousElement.insertAdjacentHTML("afterend", html);
    const pageSize = parseInt(blockElement.getAttribute("data-page-size"))
    if (pageSize) {
        const currentCount = blockElement.querySelectorAll(".av__row:not(.av__row--header)").length
        if (pageSize < currentCount) {
            blockElement.setAttribute("data-page-size", currentCount.toString());
        }
    }
};

export const stickyRow = (blockElement: HTMLElement, elementRect: DOMRect, status: "top" | "bottom" | "all") => {
    if (blockElement.querySelector(".av__title").getAttribute("contenteditable") === "false") {
        return;
    }
    const scrollRect = blockElement.querySelector(".av__scroll").getBoundingClientRect();
    const headerElement = blockElement.querySelector(".av__row--header") as HTMLElement;
    if (headerElement && (status === "top" || status === "all")) {
        const distance = Math.floor(elementRect.top - scrollRect.top);
        if (distance > 0 && distance < scrollRect.height) {
            headerElement.style.transform = `translateY(${distance}px)`;
        } else {
            headerElement.style.transform = "";
        }
    }

    const footerElement = blockElement.querySelector(".av__row--footer") as HTMLElement;
    if (footerElement && (status === "bottom" || status === "all")) {
        if (footerElement.querySelector(".av__calc--ashow")) {
            const distance = Math.ceil(elementRect.bottom - footerElement.parentElement.getBoundingClientRect().bottom);
            if (distance < 0 && -distance < scrollRect.height) {
                footerElement.style.transform = `translateY(${distance}px)`;
            } else {
                footerElement.style.transform = "";
            }
        } else {
            footerElement.style.transform = "";
        }
    }
};

const updatePageSize = (options: {
    currentPageSize: string,
    newPageSize: string,
    protyle: IProtyle,
    avID: string,
    nodeElement: Element
}) => {
    if (options.currentPageSize === options.newPageSize) {
        return;
    }
    options.nodeElement.setAttribute("data-page-size", options.newPageSize);
    transaction(options.protyle, [{
        action: "setAttrViewPageSize",
        avID: options.avID,
        data: parseInt(options.newPageSize),
    }], [{
        action: "setAttrViewPageSize",
        data: parseInt(options.currentPageSize),
        avID: options.avID,
    }]);
    document.querySelector(".av__panel")?.remove();
};

export const setPageSize = (options: {
    target: HTMLElement,
    protyle: IProtyle,
    avID: string,
    nodeElement: Element
}) => {
    const menu = new Menu("av-page-size");
    if (menu.isOpen) {
        return;
    }
    const currentPageSize = options.target.dataset.size;
    menu.addItem({
        iconHTML: "",
        label: "10",
        accelerator: currentPageSize === "10" ? '<svg class="svg" style="height: 30px; float: left;"><use xlink:href="#iconSelect"></use></svg>' : undefined,
        click() {
            updatePageSize({
                currentPageSize,
                newPageSize: "10",
                protyle: options.protyle,
                avID: options.avID,
                nodeElement: options.nodeElement
            });
        }
    });
    menu.addItem({
        iconHTML: "",
        accelerator: currentPageSize === "25" ? '<svg class="svg" style="height: 30px; float: left;"><use xlink:href="#iconSelect"></use></svg>' : undefined,
        label: "25",
        click() {
            updatePageSize({
                currentPageSize,
                newPageSize: "25",
                protyle: options.protyle,
                avID: options.avID,
                nodeElement: options.nodeElement
            });
        }
    });
    menu.addItem({
        iconHTML: "",
        accelerator: currentPageSize === "50" ? '<svg class="svg" style="height: 30px; float: left;"><use xlink:href="#iconSelect"></use></svg>' : undefined,
        label: "50",
        click() {
            updatePageSize({
                currentPageSize,
                newPageSize: "50",
                protyle: options.protyle,
                avID: options.avID,
                nodeElement: options.nodeElement
            });
        }
    });
    menu.addItem({
        iconHTML: "",
        accelerator: currentPageSize === "100" ? '<svg class="svg" style="height: 30px; float: left;"><use xlink:href="#iconSelect"></use></svg>' : undefined,
        label: "100",
        click() {
            updatePageSize({
                currentPageSize,
                newPageSize: "100",
                protyle: options.protyle,
                avID: options.avID,
                nodeElement: options.nodeElement
            });
        }
    });
    const rect = options.target.getBoundingClientRect();
    menu.open({
        x: rect.left,
        y: rect.bottom
    });
};
