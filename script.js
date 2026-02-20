import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = { databaseURL: "https://dihr-9bb0b-default-rtdb.firebaseio.com/", projectId: "dihr-9bb0b" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const boardRef = ref(db, 'workBoardData_free');

let boardData = [];
let isDragging = false;

onValue(boardRef, (snapshot) => {
    if (isDragging) return;
    const data = snapshot.val();
    boardData = data ? data.map(col => ({
        ...col,
        x: col.x || 20, y: col.y || 20,
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
        if(!column.archived) {
            colNode.style.left = column.x + 'px';
            colNode.style.top = column.y + 'px';
        }
        colNode.style.setProperty('--column-color', column.color || '#94a3b8');

        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" class="col-title">${column.title}</h1>
                <div class="btns">
                    <button class="collapse-btn">${column.collapsed ? '▼' : '▲'}</button>
                    <button class="archive-btn">📦</button>
                    <button class="delete-btn">×</button>
                </div>
            </div>
            <div class="color-picker" style="padding: 10px; display: flex; gap: 5px;">
                ${['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'].map(c => `<div class="color-dot" style="background:${c}; width:12px; height:12px; border-radius:50%; cursor:pointer;"></div>`).join('')}
            </div>
            <ul class="item-list" style="min-height:10px; list-style:none; padding:0;"></ul>
            <button class="add-item-btn" style="margin:10px;">+ 업무 추가</button>
        `;

        // 보드 이동 (좌표 수정 버전)
        const header = colNode.querySelector('.header');
        header.onmousedown = (e) => {
            if (e.target.classList.contains('col-title') || e.target.tagName === 'BUTTON') return;
            isDragging = true;
            colNode.classList.add('dragging');
            const rect = colNode.getBoundingClientRect();
            let shiftX = e.clientX - rect.left;
            let shiftY = e.clientY - rect.top;

            function moveAt(pageX, pageY) {
                if(column.archived) return;
                let newX = pageX - shiftX;
                let newY = pageY - shiftY;
                colNode.style.left = newX + 'px';
                colNode.style.top = newY + 'px';
                boardData[colIdx].x = newX;
                boardData[colIdx].y = newY;
            }
            const onMouseMove = (ev) => moveAt(ev.pageX, ev.pageY);
            document.addEventListener('mousemove', onMouseMove);
            document.onmouseup = () => {
                document.removeEventListener('mousemove', onMouseMove);
                isDragging = false;
                colNode.classList.remove('dragging');
                saveToServer();
                document.onmouseup = null;
            };
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
                    <button class="item-del" style="border:none; background:none; cursor:pointer; color:red;">×</button>
                </div>
            `;
            // 카드 드래그 이동
            itemEl.ondragstart = (e) => {
                e.stopPropagation(); isDragging = true;
                e.dataTransfer.setData('info', JSON.stringify({fCol: colIdx, fIdx: itemIdx}));
            };
            itemEl.ondragend = () => isDragging = false;
            
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
            const info = JSON.parse(e.dataTransfer.getData('info'));
            const moving = boardData[info.fCol].items.splice(info.fIdx, 1)[0];
            boardData[colIdx].items.push(moving);
            isDragging = false; saveToServer();
        };

        // 보드 버튼들
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
    const t = prompt('보드 제목:');
    if(t) { boardData.push({title:t, items:[], x:50, y:50, archived:false}); saveToServer(); }
};
