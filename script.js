const addBtns = document.querySelectorAll(".add-btn:not(.solid)");
const saveItemBtns = document.querySelectorAll(".solid");
const addItemContainers = document.querySelectorAll(".add-container");
const addItems = document.querySelectorAll(".add-item");

// Item Lists
const listColumns = document.querySelectorAll(".drag-item-list");
const backlogListEl = document.getElementById("to-do-list");
const progressListEl = document.getElementById("doing-list");
const completeListEl = document.getElementById("done-list");
const onHoldListEl = document.getElementById("on-hold-list");

// --- 추가된 부분: 컬럼 제목 요소 ---
const columnTitles = document.querySelectorAll(".header h1");

// Items
let updatedOnLoad = false;

// Initialize Arrays
let backlogListArray = [];
let progressListArray = [];
let completeListArray = [];
let onHoldListArray = [];
let listArrays = [];
// --- 추가된 부분: 제목 배열 ---
let titleListArray = [];

// Get Arrays from localStorage if available, set default values if not
function getSavedColumns() {
	if (localStorage.getItem("backlogItems")) {
		backlogListArray = JSON.parse(localStorage.backlogItems);
		progressListArray = JSON.parse(localStorage.progressItems);
		completeListArray = JSON.parse(localStorage.completeItems);
		onHoldListArray = JSON.parse(localStorage.onHoldItems);
        
        // --- 추가된 부분: 저장된 제목 불러오기 ---
        if (localStorage.getItem("columnTitles")) {
            titleListArray = JSON.parse(localStorage.columnTitles);
        } else {
            titleListArray = ["To Do", "Doing", "Done", "On Hold"];
        }
	} else {
		const intro = prompt(
			"Type 'y' (Yes) if you want to display an Editable Sample? \n(Not typing 'y' will display a plane NEW board.)"
		);
		if (intro === "y" || intro === "Y") {
			backlogListArray = [
				"Write the documentation",
				"Post a technical article",
			];
			progressListArray = ["Work on Droppi project", "Listen to Spotify"];
			completeListArray = ["Submit a PR", "Review my projects code"];
			onHoldListArray = ["Get a girlfriend"];
		} else {
			backlogListArray = [];
			progressListArray = [];
			completeListArray = [];
			onHoldListArray = [];
		}
        // 기본 제목 설정
        titleListArray = ["To Do", "Doing", "Done", "On Hold"];
	}
}

// Set localStorage Arrays
function updateSavedColumns() {
	listArrays = [
		backlogListArray,
		progressListArray,
		completeListArray,
		onHoldListArray,
	];
	const arrayNames = ["backlog", "progress", "complete", "onHold"];
	arrayNames.forEach((arrayName, index) => {
		localStorage.setItem(
			`${arrayName}Items`,
			JSON.stringify(listArrays[index])
		);
	});

    // --- 추가된 부분: 제목 저장 ---
    localStorage.setItem("columnTitles", JSON.stringify(titleListArray));
}

// Filter Array to remove empty values
function filterArray(array) {
	const filteredArray = array.filter((item) => item !== null);
	return filteredArray;
}

// Create DOM Elements for each list item
function createItemEl(columnEl, column, item, index) {
	const listEl = document.createElement("li");
	listEl.textContent = item;
	listEl.id = index;
	listEl.classList.add("drag-item");
	listEl.draggable = true;
	listEl.setAttribute("onfocusout", `updateItem(${index}, ${column})`);
	listEl.setAttribute("ondragstart", "drag(event)");
	listEl.contentEditable = true;
	columnEl.appendChild(listEl);
}

// Update Columns in DOM - Reset HTML, Filter Array, Update localStorage
function updateDOM() {
	// Check localStorage once
	if (!updatedOnLoad) {
		getSavedColumns();
	}

    // --- 추가된 부분: 화면에 제목 반영 및 수정 이벤트 연결 ---
    columnTitles.forEach((titleEl, index) => {
        titleEl.textContent = titleListArray[index];
        titleEl.contentEditable = true;
        // 포커스가 빠질 때 저장되도록 설정
        titleEl.onblur = () => {
            titleListArray[index] = titleEl.textContent;
            updateSavedColumns();
        };
    });

	// Backlog Column
	backlogListEl.textContent = "";
	backlogListArray.forEach((backlogItem, index) => {
		createItemEl(backlogListEl, 0, backlogItem, index);
	});
	backlogListArray = filterArray(backlogListArray);
    
	// Progress Column
	progressListEl.textContent = "";
	progressListArray.forEach((progressItem, index) => {
		createItemEl(progressListEl, 1, progressItem, index);
	});
	progressListArray = filterArray(progressListArray);
    
	// Complete Column
	completeListEl.textContent = "";
	completeListArray.forEach((completeItem, index) => {
		createItemEl(completeListEl, 2, completeItem, index);
	});
	completeListArray = filterArray(completeListArray);
    
	// On Hold Column
	onHoldListEl.textContent = "";
	onHoldListArray.forEach((onHoldItem, index) => {
		createItemEl(onHoldListEl, 3, onHoldItem, index);
	});
	onHoldListArray = filterArray(onHoldListArray);
    
	// Run getSavedColumns only once, Update Local Storage
	updatedOnLoad = true;
	updateSavedColumns();
}

// Update Item - Delete if necessary, or update Array value
function updateItem(id, column) {
	const selectedArray = listArrays[column];
	const selectedColumn = listColumns[column].children;
	if (!dragging) {
		if (!selectedColumn[id].textContent) {
			delete selectedArray[id];
		} else {
			selectedArray[id] = selectedColumn[id].textContent;
		}
		updateDOM();
	}
}

// Add to Column List, Reset Textbox
function addToColumn(column) {
	const itemText = addItems[column].textContent;
	const selectedArray = listArrays[column];
	if (itemText) { // 텍스트가 있을 때만 추가
		selectedArray.push(itemText);
		addItems[column].textContent = "";
		updateDOM();
	}
}

// Show Add Item Input Box
function showInputBox(column) {
	addBtns[column].style.visibility = "hidden";
	saveItemBtns[column].style.display = "flex";
	addItemContainers[column].style.display = "flex";
}

// Hide Item Input Box
function hideInputBox(column) {
	addBtns[column].style.visibility = "visible";
	saveItemBtns[column].style.display = "none";
	addItemContainers[column].style.display = "none";
	addToColumn(column);
}

// Allows arrays to reflect Drag and Drop items
function rebuildArrays() {
	backlogListArray = Array.from(backlogListEl.children).map(i => i.textContent);
	progressListArray = Array.from(progressListEl.children).map(i => i.textContent);
	completeListArray = Array.from(completeListEl.children).map(i => i.textContent);
	onHoldListArray = Array.from(onHoldListEl.children).map(i => i.textContent);
	
	updateDOM();
}

// When Item Enters Column Area
function dragEnter(column) {
	listColumns[column].classList.add("over");
	currentColumn = column;
}

// When Item Starts Dragging
function drag(e) {
	draggedItem = e.target;
	dragging = true;
}

// Column Allows for Item to Drop
function allowDrop(e) {
	e.preventDefault();
}

// Dropping Item in Column
function drop(e) {
	e.preventDefault();
	const parent = listColumns[currentColumn];
	listColumns.forEach((column) => {
		column.classList.remove("over");
	});
	parent.appendChild(draggedItem);
	dragging = false;
	rebuildArrays();
}

// On Load
updateDOM();
