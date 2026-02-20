import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = { databaseURL: "https://dihr-9bb0b-default-rtdb.firebaseio.com/", projectId: "dihr-9bb0b" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const boardRef = ref(db, 'workBoardData_free'); // 자유배치용 새 경로

let boardData = [];
let isDragging = false;

onValue(boardRef, (snapshot) => {
    if (isDragging) return; // 덮어쓰기 방지
    const data = snapshot.val();
    boardData = data ? data.map(col => ({
        ...col,
        x: col.x || 20, // 기본 좌표
        y: col.y || 20,
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
        
        // [자유도 핵심] 저장된 좌표 적용
        if(!column.archived) {
            colNode.style.left = `${column.x}px`;
            colNode.style.top = `${column.y}px`;
        }
        
        colNode.style.setProperty('--column-color', column.color || '#3b82f6');

        colNode.innerHTML = `
            <div class="header">
                <b contenteditable="true" class="title-edit">${column.title}</b>
                <div class="btns">
                    <button class="col-collapse-btn">▼</button>
                    <button class="col-archive-btn">📦</button>
                </div>
            </div>
            <div class="board-colors" style="display:flex; gap:5px; padding:10px;">
                ${['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'].map(c => `<div class="color-dot" style="background:${c}; width:12px; height:12px; border-radius:50%; cursor:pointer;"></div>`).join('')}
            </div>
            <ul class="item-list" style="min-height:50px; list-style:none; padding:0;"></ul>
            <button class="add-item-btn" style="margin:10px;">+ 추가</button>
        `;

        // --- 보드 자유 이동 로직 (마우스 드래그) ---
        const header = colNode.querySelector('.header');
        header.onmousedown = (e) => {
            if (e.target.classList.contains('title-edit')) return;
            isDragging = true;
            let shiftX = e.clientX - colNode.getBoundingClientRect().left;
            let shiftY = e.clientY - colNode.getBoundingClientRect().top;

            function moveAt(pageX, pageY) {
                if(column.archived) return;
                const newX = pageX - shiftX;
                const newY = pageY - shiftY;
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
                saveToServer(); // 위치 최종 저장
            };
        };

        // --- 카드 렌더링 및 이동 ---
        const itemList = colNode.querySelector('.item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.style.backgroundColor = item.color || '#ffffff';
            itemEl.draggable = true;
            itemEl.innerHTML = `<div contenteditable="true" class="item-text" style="outline:none;">${item.text}</div>`;

            itemEl.ondragstart = (e) => {
                e.stopPropagation();
                isDragging = true;
                e.dataTransfer.setData('itemInfo', JSON.stringify({fCol: colIdx, fIdx: itemIdx}));
            };
            itemEl.ondragend = () => { isDragging = false; };
            itemList.appendChild(itemEl);
        });

        // 카드 드롭 (보드 간 이동)
        itemList.ondragover = (e) => e.preventDefault();
        itemList.ondrop = (e) => {
            e.preventDefault(); e.stopPropagation();
            const info = e.dataTransfer.getData('itemInfo');
            if (info) {
                const {fCol, fIdx} = JSON.parse(info);
                const moving = boardData[fCol].items.splice(fIdx, 1)[0];
                boardData[colIdx].items.push(moving);
                isDragging = false; saveToServer();
            }
        };

        // 색상 및 기타 버튼
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            dot.onclick = () => { boardData[colIdx].color = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'][i]; saveToServer(); };
        });
        colNode.querySelector('.col-archive-btn').onclick = () => { boardData[colIdx].archived = !boardData[colIdx].archived; saveToServer(); };
        colNode.querySelector('.add-item-btn').onclick = () => { boardData[colIdx].items.push({text: '새 업무', color: '#ffffff'}); saveToServer(); };

        if (column.archived) {
            colNode.style.position = 'static'; // 보관함에서는 다시 나열식으로
            archiveList.appendChild(colNode);
        } else {
            mainList.appendChild(colNode);
        }
    });
}

document.getElementById('add-col-btn').onclick = () => {
    const t = prompt('보드 제목:');
    if(t) {
        boardData.push({title: t, items: [], x: 50, y: 50, collapsed: false, archived: false, color: '#3b82f6'});
        saveToServer();
    }
};
