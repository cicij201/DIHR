// ... Firebase 설정 부분 동일 ...

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
        colNode.style.setProperty('--column-color', column.color || '#94a3b8');
        colNode.draggable = true;

        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" class="col-title">${column.title}</h1>
                <div class="header-btns">
                    <button class="icon-btn collapse-btn">${column.collapsed ? '▶' : '▼'}</button>
                    <button class="icon-btn archive-btn">📦</button>
                    <button class="icon-btn delete-btn">×</button>
                </div>
            </div>
            <div class="color-picker">
                ${['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#94a3b8'].map(c => 
                    `<div class="color-dot" style="background:${c}"></div>`
                ).join('')}
            </div>
            <div class="custom-scroll"><ul class="drag-item-list"></ul></div>
            <div class="add-btn-group"><button class="add-item-btn">+ 추가</button></div>
        `;

        // 보드 색상 변경
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#94a3b8'];
            dot.onclick = () => { boardData[colIdx].color = colors[i]; saveToServer(); };
        });

        // --- [보정] 보드 드래그 ---
        colNode.ondragstart = (e) => {
            if (e.target.classList.contains('drag-item')) return;
            isDragging = true;
            e.dataTransfer.setData('colIdx', colIdx);
        };

        // --- [보정] 아이템 리스트 ---
        const listEl = colNode.querySelector('.drag-item-list');
        (column.items || []).forEach((itemObj, itemIdx) => {
            // 구 버전 데이터(문자열) 호환 처리
            const itemData = typeof itemObj === 'string' ? { text: itemObj, color: '#ffffff' } : itemObj;
            
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.style.setProperty('--item-color', itemData.color);
            itemEl.draggable = true;
            
            itemEl.innerHTML = `
                <div contenteditable="true" class="item-text">${itemData.text}</div>
                <div class="item-color-picker">
                    ${['#fee2e2','#fef3c7','#d1fae5','#dbeafe','#ede9fe','#ffffff'].map(c => 
                        `<div class="item-color-dot" style="background:${c}"></div>`
                    ).join('')}
                </div>
            `;

            // 카드 색상 변경
            itemEl.querySelectorAll('.item-color-dot').forEach((dot, i) => {
                const itemColors = ['#fee2e2','#fef3c7','#d1fae5','#dbeafe','#ede9fe','#ffffff'];
                dot.onclick = (e) => {
                    e.stopPropagation();
                    boardData[colIdx].items[itemIdx] = { ...itemData, color: itemColors[i] };
                    saveToServer();
                };
            });

            // 카드 드래그 시작
            itemEl.ondragstart = (e) => {
                e.stopPropagation();
                isDragging = true;
                e.dataTransfer.setData('itemInfo', JSON.stringify({fromCol: colIdx, fromIdx: itemIdx}));
            };

            // 내용 수정
            itemEl.querySelector('.item-text').onblur = (e) => {
                boardData[colIdx].items[itemIdx] = { ...itemData, text: e.target.textContent };
                saveToServer();
            };

            listEl.appendChild(itemEl);
        });

        // --- [수정] 카드 드롭 처리 (가장 중요) ---
        listEl.ondragover = (e) => {
            e.preventDefault();
            e.currentTarget.style.background = "rgba(0,0,0,0.05)";
        };
        listEl.ondragleave = (e) => e.currentTarget.style.background = "";
        listEl.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            listEl.style.background = "";
            
            const rawData = e.dataTransfer.getData('itemInfo');
            if (rawData) {
                const {fromCol, fromIdx} = JSON.parse(rawData);
                // 이동할 아이템 추출
                const movingItem = boardData[fromCol].items.splice(fromIdx, 1)[0];
                if (!boardData[colIdx].items) boardData[colIdx].items = [];
                
                // 해당 컬럼의 끝에 추가
                boardData[colIdx].items.push(movingItem);
                isDragging = false;
                saveToServer();
            }
        };

        // ... 나머지 버튼(삭제, 보관 등) 이벤트는 동일 ...
        colNode.querySelector('.add-item-btn').onclick = () => {
            if(!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push({text: '새 할 일', color: '#ffffff'});
            saveToServer();
        };

        if (column.archived) { archiveList.appendChild(colNode); archCount++; }
        else mainList.appendChild(colNode);
    });
    document.getElementById('archive-count').textContent = archCount;
}
