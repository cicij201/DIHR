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
    // 데이터 구조 표준화 (문자열 아이템 -> 객체 변환)
    boardData = data ? data.map(col => ({
        ...col,
        items: (col.items || []).map(item => typeof item === 'string' ? { text: item, color: '#ffffff' } : item)
    })) : [];
    renderDOM();
});

function saveToServer() {
    set(boardRef, boardData);
}

function renderDOM() {
    const mainList = document.getElementById('main-drag-list');
    const archiveList = document.getElementById('archive-drag-list');
    if (!mainList) return;

    mainList.innerHTML = '';
    archiveList.innerHTML = '';
    let archCount = 0;

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        colNode.style.setProperty('--column-color', column.color || '#3b82f6');
        colNode.draggable = true;

        // [복구] 보드 색상 선택기 HTML
        const boardColors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#94a3b8'];
        const colorDotsHTML = boardColors.map(c => 
            `<div class="color-dot" style="background:${c}; width:12px; height:12px; border-radius:50%; cursor:pointer; border:1px solid rgba(0,0,0,0.1);"></div>`
        ).join('');

        colNode.innerHTML = `
            <div class="header">
                <h1 class="col-title">
                    <span contenteditable="true" class="title-edit">${column.title}</span>
                    <span class="badge" style="font-size:11px; background:rgba(0,0,0,0.1); padding:2px 6px; border-radius:10px;">${column.items ? column.items.length : 0}</span>
                </h1>
                <div class="header-btns">
                    <button class="collapse-btn">${column.collapsed ? '▼' : '▲'}</button>
                    <button class="archive-btn">📦</button>
                    <button class="delete-btn">×</button>
                </div>
            </div>
            <div class="color-picker" style="display:flex; gap:6px; padding:0 15px 10px;">
                ${colorDotsHTML}
            </div>
            <div class="custom-scroll"><ul class="drag-item-list"></ul></div>
            <div style="padding:10px;"><button class="add-item-btn" style="width:100%; cursor:pointer;">+ 추가</button></div>
        `;

        // 보드 제목 수정 이벤트
        const titleEdit = colNode.querySelector('.title-edit');
        titleEdit.onblur = () => { boardData[colIdx].title = titleEdit.textContent; saveToServer(); };

        // 보드 색상 변경 이벤트 연결
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            dot.onclick = () => { boardData[colIdx].color = boardColors[i]; saveToServer(); };
        });

        // 보드 버튼 이벤트
        colNode.querySelector('.collapse-btn').onclick = () => { boardData[colIdx].collapsed = !boardData[colIdx].collapsed; saveToServer(); };
        colNode.querySelector('.archive-btn').onclick = () => { boardData[colIdx].archived = !boardData[colIdx].archived; saveToServer(); };
        colNode.querySelector('.delete-btn').onclick = () => { if(confirm('삭제하시겠습니까?')) { boardData.splice(colIdx, 1); saveToServer(); } };

        // 카드(아이템) 렌더링
        const listEl = colNode.querySelector('.drag-item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.style.backgroundColor = item.color || '#ffffff';
            itemEl.draggable = true;

            // [복구] 카드 개별 색상 선택기 HTML
            const itemColors = ['#fee2e2','#fef3c7','#d1fae5','#dbeafe','#ede9fe','#ffffff'];
            const itemDotsHTML = itemColors.map(c => 
                `<div class="item-color-dot" style="background:${c}; width:10px; height:10px; border-radius:50%; cursor:pointer; border:1px solid rgba(0,0,0,0.1);"></div>`
            ).join('');

            itemEl.innerHTML = `
                <div contenteditable="true" class="item-text" style="flex-grow:1; outline:none;">${item.text}</div>
                <div class="item-color-picker" style="display:none; gap:3px; margin-left:8px;">
                    ${itemDotsHTML}
                </div>
            `;

            // 마우스 올렸을 때만 카드 색상 선택기 노출
            itemEl.onmouseenter = () => { itemEl.querySelector('.item-color-picker').style.display = 'flex'; };
            itemEl.onmouseleave = () => { itemEl.querySelector('.item-color-picker').style.display = 'none'; };

            // 카드 텍스트 수정
            const textEdit = itemEl.querySelector('.item-text');
            textEdit.onblur = () => { boardData[colIdx].items[itemIdx].text = textEdit.textContent; saveToServer(); };

            // 카드 색상 변경 이벤트
            itemEl.querySelectorAll('.item-color-dot').forEach((dot, i) => {
                dot.onclick = (e) => {
                    e.stopPropagation();
                    boardData[colIdx].items[itemIdx].color = itemColors[i];
                    saveToServer();
                };
            });

            // 카드 드래그 시작
            itemEl.ondragstart = (e) => {
                e.stopPropagation();
                isDragging = true;
                e.dataTransfer.setData('itemInfo', JSON.stringify({fCol: colIdx, fIdx: itemIdx}));
            };
            itemEl.ondragend = () => isDragging = false;

            listEl.appendChild(itemEl);
        });

        // 카드 드롭 로직
        listEl.ondragover = (e) => e.preventDefault();
        listEl.ondrop = (e) => {
            e.preventDefault(); e.stopPropagation();
            const info = e.dataTransfer.getData('itemInfo');
            if(info) {
                const {fCol, fIdx} = JSON.parse(info);
                const moving = boardData[fCol].items.splice(fIdx, 1)[0];
                if(!boardData[colIdx].items) boardData[colIdx].items = [];
                boardData[colIdx].items.push(moving);
                isDragging = false;
                saveToServer();
            }
        };

        // 보드 드래그앤드롭 (보드 순서 변경)
        colNode.ondragstart = (e) => { if(e.target.closest('.drag-item')) return; isDragging = true; e.dataTransfer.setData('fromIdx', colIdx); };
        colNode.ondragend = () => isDragging = false;
        colNode.ondragover = (e) => e.preventDefault();
        colNode.ondrop = (e) => {
            const fromIdx = e.dataTransfer.getData('fromIdx');
            if(fromIdx !== "" && fromIdx != colIdx) {
                const temp = boardData[fromIdx];
                boardData.splice(fromIdx, 1);
                boardData.splice(colIdx, 0, temp);
                isDragging = false;
                saveToServer();
            }
        };

        // 업무 추가 버튼
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

document.getElementById('add-col-btn').onclick = () => {
    const t = prompt('보드 제목:');
    if(t) { boardData.push({title: t, items: [], collapsed: false, archived: false, color: '#3b82f6'}); saveToServer(); }
};
document.getElementById('archive-toggle-btn').onclick = () => document.getElementById('archive-section').classList.toggle('open');
