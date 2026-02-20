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
        
        // 1. 좌표 및 색상 적용
        if(!column.archived) {
            colNode.style.left = (column.x || 20) + 'px';
            colNode.style.top = (column.y || 20) + 'px';
        }
        colNode.style.setProperty('--column-color', column.color || '#3b82f6');

        colNode.innerHTML = `
            <div class="header">
                <b contenteditable="true" class="title-edit">${column.title}</b>
                <div class="btns">
                    <button class="col-collapse-btn">▲</button>
                    <button class="col-archive-btn">📦</button>
                </div>
            </div>
            <div class="board-colors" style="display:flex; gap:5px; padding:0 12px 10px;">
                ${['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'].map(c => `<div class="color-dot" style="background:${c}; width:12px; height:12px; border-radius:50%; cursor:pointer;"></div>`).join('')}
            </div>
            <ul class="item-list" style="min-height:20px; list-style:none; padding:0;"></ul>
            <button class="add-item-btn" style="margin:10px; cursor:pointer;">+ 업무 추가</button>
        `;

        // --- 문제 1 해결: 보드 이동 (오프셋 교정) ---
        const header = colNode.querySelector('.header');
        header.onmousedown = (e) => {
            if (e.target.classList.contains('title-edit') || e.target.tagName === 'BUTTON') return;
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

            function onMouseMove(event) { moveAt(event.pageX, event.pageY); }
            document.addEventListener('mousemove', onMouseMove);
            
            document.onmouseup = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.onmouseup = null;
                isDragging = false;
                colNode.classList.remove('dragging');
                saveToServer();
            };
        };

        // --- 문제 2 & 3 해결: 카드 렌더링 및 색상/이동 ---
        const itemList = colNode.querySelector('.item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.style.backgroundColor = item.color || '#ffffff';
            itemEl.draggable = true;
            itemEl.innerHTML = `
                <div contenteditable="true" class="item-text" style="outline:none; flex:1;">${item.text}</div>
                <div class="item-colors">
                    ${['#fee2e2','#d1fae5','#dbeafe','#ffffff'].map(c => `<div class="item-color-dot" style="background:${c}"></div>`).join('')}
                </div>
            `;

            // 카드 색상 변경
            itemEl.querySelectorAll('.item-color-dot').forEach((dot, i) => {
                dot.onclick = (e) => {
                    e.stopPropagation();
                    const colors = ['#fee2e2','#d1fae5','#dbeafe','#ffffff'];
                    boardData[colIdx].items[itemIdx].color = colors[i];
                    saveToServer();
                };
            });

            // 카드 텍스트 수정 시 내용 유지
            const textNode = itemEl.querySelector('.item-text');
            textNode.onblur = () => {
                boardData[colIdx].items[itemIdx].text = textNode.textContent;
                saveToServer();
            };

            // 카드 드래그 (보드 간 이동)
            itemEl.ondragstart = (e) => {
                e.stopPropagation();
                isDragging = true;
                e.dataTransfer.setData('itemInfo', JSON.stringify({fCol: colIdx, fIdx: itemIdx}));
            };
            itemEl.ondragend = () => { isDragging = false; };
            itemList.appendChild(itemEl);
        });

        // 카드 드롭
        itemList.ondragover = (e) => e.preventDefault();
        itemList.ondrop = (e) => {
            e.preventDefault(); e.stopPropagation();
            const info = e.dataTransfer.getData('itemInfo');
            if (info) {
                const {fCol, fIdx} = JSON.parse(info);
                const moving = {...boardData[fCol].items[fIdx]}; // 복사해서 초기화 방지
                boardData[fCol].items.splice(fIdx, 1);
                if(!boardData[colIdx].items) boardData[colIdx].items = [];
                boardData[colIdx].items.push(moving);
                isDragging = false; saveToServer();
            }
        };

        // 보드 기능 버튼
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            dot.onclick = () => { 
                const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'];
                boardData[colIdx].color = colors[i]; 
                saveToServer(); 
            };
        });
        colNode.querySelector('.col-archive-btn').onclick = () => { boardData[colIdx].archived = !boardData[colIdx].archived; saveToServer(); };
        colNode.querySelector('.add-item-btn').onclick = () => {
            if(!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push({text: '새 업무', color: '#ffffff'});
            saveToServer();
        };

        if (column.archived) archiveList.appendChild(colNode);
        else mainList.appendChild(colNode);
    });
}
