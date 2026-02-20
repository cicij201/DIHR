import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = { databaseURL: "https://dihr-9bb0b-default-rtdb.firebaseio.com/", projectId: "dihr-9bb0b" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const boardRef = ref(db, 'workBoardData');

let boardData = [];
let isDragging = false; 

// [수신] 드래그 중 업데이트 방지로 덮어쓰기 차단
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
    if (!mainList) return;

    mainList.innerHTML = '';
    archiveList.innerHTML = '';

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        colNode.style.setProperty('--column-color', column.color || '#3b82f6');
        colNode.draggable = true;

        colNode.innerHTML = `
            <div class="header" style="padding:12px; display:flex; justify-content:space-between; align-items:center;">
                <b contenteditable="true" class="title-edit">${column.title}</b>
                <div class="btns">
                    <button class="col-collapse-btn">${column.collapsed ? '▼' : '▲'}</button>
                    <button class="col-archive-btn">📦</button>
                    <button class="col-delete-btn">×</button>
                </div>
            </div>
            <div class="board-colors" style="display:flex; gap:5px; padding:0 12px 10px;">
                ${['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'].map(c => `<div class="color-dot" style="background:${c}"></div>`).join('')}
            </div>
            <ul class="item-list" style="list-style:none; padding:0; margin:0;"></ul>
            <button class="add-item-btn" style="margin:10px; cursor:pointer;">+ 업무 추가</button>
        `;

        // 보드 이동 (Drag & Drop)
        colNode.ondragstart = (e) => { if(e.target.classList.contains('drag-item')) return; isDragging = true; e.dataTransfer.setData('colIdx', colIdx); };
        colNode.ondragover = (e) => e.preventDefault();
        colNode.ondrop = (e) => {
            const fromIdx = e.dataTransfer.getData('colIdx');
            if(fromIdx !== "" && fromIdx != colIdx) {
                const temp = boardData[fromIdx];
                boardData.splice(fromIdx, 1);
                boardData.splice(colIdx, 0, temp);
                isDragging = false; saveToServer();
            }
        };

        // 카드 렌더링
        const itemList = colNode.querySelector('.item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.style.backgroundColor = item.color || '#ffffff';
            itemEl.draggable = true;
            itemEl.innerHTML = `
                <div contenteditable="true" class="item-text" style="outline:none; flex:1;">${item.text}</div>
                <div class="item-colors" style="display:none; gap:3px;">
                    ${['#fee2e2','#d1fae5','#dbeafe','#ffffff'].map(c => `<div class="item-color-dot" style="background:${c}"></div>`).join('')}
                </div>
            `;
            
            // 카드 색상 변경 기능
            itemEl.onmouseenter = () => itemEl.querySelector('.item-colors').style.display = 'flex';
            itemEl.onmouseleave = () => itemEl.querySelector('.item-colors').style.display = 'none';
            itemEl.querySelectorAll('.item-color-dot').forEach((dot, i) => {
                dot.onclick = () => { boardData[colIdx].items[itemIdx].color = ['#fee2e2','#d1fae5','#dbeafe','#ffffff'][i]; saveToServer(); };
            });

            // 카드 이동 (Drag & Drop)
            itemEl.ondragstart = (e) => { e.stopPropagation(); isDragging = true; e.dataTransfer.setData('itemInfo', JSON.stringify({fCol: colIdx, fIdx: itemIdx})); };
            itemEl.ondragend = () => isDragging = false;

            itemList.appendChild(itemEl);
        });

        // 카드 드롭 위치 처리
        itemList.ondragover = (e) => e.preventDefault();
        itemList.ondrop = (e) => {
            e.preventDefault(); e.stopPropagation();
            const info = e.dataTransfer.getData('itemInfo');
            if(info) {
                const {fCol, fIdx} = JSON.parse(info);
                const moving = boardData[fCol].items.splice(fIdx, 1)[0];
                if(!boardData[colIdx].items) boardData[colIdx].items = [];
                boardData[colIdx].items.push(moving);
                isDragging = false; saveToServer();
            }
        };

        // 보드 색상 변경
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            dot.onclick = () => { boardData[colIdx].color = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'][i]; saveToServer(); };
        });

        // 보드 기능 버튼들
        colNode.querySelector('.col-collapse-btn').onclick = () => { boardData[colIdx].collapsed = !boardData[colIdx].collapsed; saveToServer(); };
        colNode.querySelector('.col-archive-btn').onclick = () => { boardData[colIdx].archived = !boardData[colIdx].archived; saveToServer(); };
        colNode.querySelector('.col-delete-btn').onclick = () => { if(confirm('삭제?')) { boardData.splice(colIdx, 1); saveToServer(); } };
        colNode.querySelector('.add-item-btn').onclick = () => { boardData[colIdx].items.push({text: '새 업무', color: '#ffffff'}); saveToServer(); };

        // 섹션 분리 배치
        if (column.archived) archiveList.appendChild(colNode);
        else mainList.appendChild(colNode);
    });
}
