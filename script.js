import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = { databaseURL: "https://dihr-9bb0b-default-rtdb.firebaseio.com/", projectId: "dihr-9bb0b" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const boardRef = ref(db, 'workBoardData'); // 기존 정렬형 경로 사용

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
    mainList.innerHTML = ''; archiveList.innerHTML = '';
    let archCount = 0;

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        colNode.style.setProperty('--column-color', column.color || '#94a3b8');
        colNode.draggable = true;

        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" class="col-title">${column.title}</h1>
                <div class="btns">
                    <button class="collapse-btn">${column.collapsed ? '▼' : '▲'}</button>
                    <button class="archive-btn">📦</button>
                    <button class="delete-btn">×</button>
                </div>
            </div>
            <div class="color-picker" style="padding:0 12px 10px; display:flex; gap:5px;">
                ${['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'].map(c => `<div class="color-dot" style="background:${c}; width:12px; height:12px; border-radius:50%; cursor:pointer;"></div>`).join('')}
            </div>
            <ul class="item-list" style="min-height:20px; list-style:none; padding:0;"></ul>
            <button class="add-item-btn" style="margin:10px; cursor:pointer;">+ 업무 추가</button>
        `;

        // 보드 순서 드래그
        colNode.ondragstart = (e) => { 
            if(e.target.closest('.drag-item')) return;
            isDragging = true; e.dataTransfer.setData('type', 'col'); e.dataTransfer.setData('from', colIdx); 
        };
        colNode.ondragover = (e) => e.preventDefault();
        colNode.ondrop = (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('type');
            if (type === 'col') {
                const fromIdx = e.dataTransfer.getData('from');
                const temp = boardData.splice(fromIdx, 1)[0];
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
                <div contenteditable="true" class="item-text" style="outline:none;">${item.text}</div>
                <div class="item-color-picker">
                    ${['#fee2e2','#d1fae5','#dbeafe','#ffffff'].map(c => `<div class="item-color-dot" style="background:${c}"></div>`).join('')}
                    <button class="item-del" style="border:none; color:red; cursor:pointer;">×</button>
                </div>
            `;
            itemEl.ondragstart = (e) => { e.stopPropagation(); isDragging = true; e.dataTransfer.setData('type', 'item'); e.dataTransfer.setData('info', JSON.stringify({fCol: colIdx, fIdx: itemIdx})); };
            
            // 카드 색상 & 삭제
            itemEl.querySelectorAll('.item-color-dot').forEach((dot, i) => {
                dot.onclick = () => { boardData[colIdx].items[itemIdx].color = ['#fee2e2','#d1fae5','#dbeafe','#ffffff'][i]; saveToServer(); };
            });
            itemEl.querySelector('.item-del').onclick = () => { boardData[colIdx].items.splice(itemIdx, 1); saveToServer(); };
            itemList.appendChild(itemEl);
        });

        // 카드 드롭
        itemList.ondragover = (e) => e.preventDefault();
        itemList.ondrop = (e) => {
            e.preventDefault(); e.stopPropagation();
            const type = e.dataTransfer.getData('type');
            if (type === 'item') {
                const info = JSON.parse(e.dataTransfer.getData('info'));
                const moving = boardData[info.fCol].items.splice(info.fIdx, 1)[0];
                boardData[colIdx].items.push(moving);
                isDragging = false; saveToServer();
            }
        };

        // 버튼 이벤트
        colNode.querySelector('.collapse-btn').onclick = () => { boardData[colIdx].collapsed = !boardData[colIdx].collapsed; saveToServer(); };
        colNode.querySelector('.archive-btn').onclick = () => { boardData[colIdx].archived = !boardData[colIdx].archived; saveToServer(); };
        colNode.querySelector('.delete-btn').onclick = () => { if(confirm('삭제할까요?')) { boardData.splice(colIdx, 1); saveToServer(); } };
        colNode.querySelector('.add-item-btn').onclick = () => { boardData[colIdx].items.push({text:'새 업무', color:'#ffffff'}); saveToServer(); };
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            dot.onclick = () => { boardData[colIdx].color = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'][i]; saveToServer(); };
        });

        if (column.archived) { archiveList.appendChild(colNode); archCount++; }
        else mainList.appendChild(colNode);
    });
    document.getElementById('archive-count').textContent = archCount;
}

document.getElementById('archive-header').onclick = () => document.getElementById('archive-section').classList.toggle('open');
document.getElementById('add-col-btn').onclick = () => {
    const t = prompt('새 보드 제목:');
    if(t) { boardData.push({title:t, items:[], archived:false, collapsed:false}); saveToServer(); }
};
