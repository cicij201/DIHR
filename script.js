// 기존 변수 및 Firebase 설정 유지...

function renderDOM() {
    const mainList = document.getElementById('main-drag-list');
    const archiveList = document.getElementById('archive-drag-list');
    mainList.innerHTML = '';
    
    // 1. 섹션 가이드 라벨 생성 (배경에 이름 깔기)
    const sectionNames = ["주 4.5일제", "인사평가시스템", "인감신청 프로세스"];
    sectionNames.forEach((name, i) => {
        const label = document.createElement('div');
        label.className = 'section-guide-label';
        label.style.left = (i * 350) + 'px';
        label.textContent = name;
        mainList.appendChild(label);
    });
    // 보드 버튼 그룹에 삭제 버튼 추가
colNode.innerHTML = `
    <div class="header">
        <b contenteditable="true" class="title-edit">${column.title}</b>
        <div class="btns">
            <button class="col-collapse-btn">▲</button>
            <button class="col-archive-btn">📦</button>
            <button class="col-delete-btn">×</button> </div>
    </div>
';
// 삭제 버튼 클릭 이벤트
colNode.querySelector('.col-delete-btn').onclick = (e) => {
    e.stopPropagation(); // 드래그 이벤트 방해 금지
    if (confirm(`'${column.title}' 보드를 삭제하시겠습니까?\n내부의 모든 업무가 사라집니다.`)) {
        boardData.splice(colIdx, 1); // 배열에서 제거
        saveToServer(); // 서버 저장
    }
};

    // 2. 보드 렌더링 (기존 자유배치 로직 그대로)
    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        
        // 좌표 적용 (서버 저장값)
        if(!column.archived) {
            colNode.style.left = (column.x || 20) + 'px';
            colNode.style.top = (column.y || 60) + 'px'; // 라벨 아래부터 시작
        }
        colNode.style.setProperty('--column-color', column.color || '#3b82f6');

        // 내부 HTML (보드 제목, 버튼, 카드 리스트, +업무추가 버튼)
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
            <ul class="item-list"></ul>
            <button class="add-item-btn" style="margin:10px; cursor:pointer;">+ 추가</button>
        `;

        // [핵심] 보드 드래그 핸들러 (기존 오프셋 교정 버전)
        const header = colNode.querySelector('.header');
        header.onmousedown = (e) => {
            if (e.target.classList.contains('title-edit') || e.target.tagName === 'BUTTON') return;
            isDragging = true;
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
                saveToServer();
            };
        };

        // --- 카드 렌더링 및 색상 변경 로직 (기존 기능 유지) ---
        const itemList = colNode.querySelector('.item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.style.backgroundColor = item.color || '#ffffff';
            itemEl.draggable = true;
            itemEl.innerHTML = `
                <div contenteditable="true" class="item-text" style="outline:none; flex:1;">${item.text}</div>
                <div class="item-colors" style="display:none; gap:3px;">
                    ${['#fee2e2','#d1fae5','#dbeafe','#ffffff'].map(c => `<div class="item-color-dot" style="background:${c}; width:10px; height:10px; border-radius:50%; cursor:pointer; border:1px solid #ddd;"></div>`).join('')}
                </div>
            `;
            
            // 카드 색상 선택기 표시/비표시
            itemEl.onmouseenter = () => { itemEl.querySelector('.item-colors').style.display = 'flex'; };
            itemEl.onmouseleave = () => { itemEl.querySelector('.item-colors').style.display = 'none'; };

            // 카드 색상 변경 클릭
            itemEl.querySelectorAll('.item-color-dot').forEach((dot, i) => {
                dot.onclick = (e) => {
                    e.stopPropagation();
                    const colors = ['#fee2e2','#d1fae5','#dbeafe','#ffffff'];
                    boardData[colIdx].items[itemIdx].color = colors[i];
                    saveToServer();
                };
            });

            // 카드 드래그 이동 로직 (생략 - 기존과 동일)
            // ... (생략된 드래그 앤 드롭 로직)
            
            itemList.appendChild(itemEl);
        });

        // 보관함 분기
        if (column.archived) archiveList.appendChild(colNode);
        else mainList.appendChild(colNode);
    });
    
    // 업무 완료함 카운트 및 토글 이벤트 재연결
    updateArchiveCount();
}

