import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://dihr-9bb0b-default-rtdb.firebaseio.com/",
    projectId: "dihr-9bb0b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const boardRef = ref(db, 'workBoardData');

let boardData = [];
let isDragging = false;

onValue(boardRef, (snapshot) => {
    if (isDragging) return;
    const data = snapshot.val();
    boardData = data ? data.map(col => ({
        ...col,
        items: (col.items || []).map(item => typeof item === 'string' ? { text: item, color: '#ffffff' } : item)
    })) : [];
    renderDOM();
});

function saveToServer() { set(boardRef, boardData); }

function renderDOM() {
    const mainList = document.getElementById('main-drag-list');
    const archiveList = document.getElementById('archive-drag-list');
    if (!mainList || !archiveList) return;

    mainList.innerHTML = '';
    archiveList.innerHTML = '';
    let archCount = 0;

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        colNode.style.setProperty('--column-color', column.color || '#94a3b8');
        colNode.draggable = true;

        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" class="col-title">${column.title} <span class="badge">${column.items ? column.items.length : 0}</span></h1>
                <div class="header-btns">
                    <button class="icon-btn collapse-btn">${column.collapsed ? '▼' : '▲'}</button>
                    <button class="icon-btn archive-btn">${column.archived ? '⬆️' : '📦'}</button>
                    <button class="icon-btn delete-btn">×</button>
                </div>
            </div>
            <div class="custom-scroll"><ul class="drag-item-list"></ul></div>
            <div class="add-btn-group" style="padding:10px;"><button class="add-item-btn" style="width:100%;">+ 추가</button></div>
        `;

        // 보드 드래그앤드롭
        colNode.ondragstart = (e) => { if (e.target.closest('.drag-item')) return; isDragging = true; e.dataTransfer.setData('type', 'column'); e.dataTransfer.setData('fromIdx', colIdx); };
        colNode.ondragend = () => isDragging = false;
        colNode.ondragover = (e) => e.preventDefault();
        colNode.ondrop = (e) => {
            const type = e.dataTransfer.getData('type');
            const fromIdx = e.dataTransfer.getData('fromIdx');
            if (type === 'column' && fromIdx !== "" && fromIdx != colIdx) {
                const temp = boardData[fromIdx];
                boardData.splice(fromIdx, 1);
                boardData.splice(colIdx, 0, temp);
                isDragging = false;
                saveToServer();
            }
        };

        // 보드 내부 카드 렌더링 및 드롭 처리 (기존 로직 유지)
        const listEl = colNode.querySelector('.drag-item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.style.backgroundColor = item.color || '#ffffff';
            itemEl.draggable = true;
            itemEl.innerHTML = `<div contenteditable="true">${item.text}</div>`;
            itemEl.ondragstart = (e) => { e.stopPropagation(); isDragging = true; e.dataTransfer.setData('type', 'item'); e.dataTransfer.setData('info', JSON.stringify({fromCol: colIdx, fromIdx: itemIdx})); };
            itemEl.ondragend = () => isDragging = false;
            listEl.appendChild(itemEl);
        });

        listEl.ondragover = (e) => e.preventDefault();
        listEl.ondrop = (e) => {
            e.preventDefault(); e.stopPropagation();
            const type = e.dataTransfer.getData('type');
            const info = e.dataTransfer.getData('info');
            if (type === 'item' && info) {
                const {fromCol, fromIdx} = JSON.parse(info);
                const moving = boardData[fromCol].items.splice(fromIdx, 1)[0];
                if (!boardData[colIdx].items) boardData[colIdx].items = [];
                boardData[colIdx].items.push(moving);
                isDragging = false;
                saveToServer();
            }
        };

        // 버튼 이벤트
        colNode.querySelector('.collapse-btn').onclick = () => { boardData[colIdx].collapsed = !boardData[colIdx].collapsed; saveToServer(); };
        colNode.querySelector('.archive-btn').onclick = () => { boardData[colIdx].archived = !boardData[colIdx].archived; saveToServer(); };
        colNode.querySelector('.delete-btn').onclick = () => { if(confirm('삭제하시겠습니까?')) { boardData.splice(colIdx, 1); saveToServer(); } };
        colNode.querySelector('.add-item-btn').onclick = () => {
            if(!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push({text: '새 업무', color: '#ffffff'});
            saveToServer();
        };

        if (column.archived) { archiveList.appendChild(colNode); archCount++; }
        else mainList.appendChild(colNode);
    });
    document.getElementById('archive-count').textContent = archCount;
}

// --- 보관함 열기/닫기 이벤트 수정 ---
document.getElementById('archive-toggle-btn').onclick = (e) => {
    e.preventDefault();
    const section = document.getElementById('archive-section');
    section.classList.toggle('open');
};

document.getElementById('add-col-btn').onclick = () => {
    const t = prompt('보드 제목:');
    if(t) { boardData.push({title: t, items: [], collapsed: false, archived: false, color: '#3b82f6'}); saveToServer(); }
};
