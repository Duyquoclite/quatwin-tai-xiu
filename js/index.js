const QUẤT_MONEY = 1000000000; // Số dư khởi tạo, thay đổi tại đây
class BomWinGame {
    constructor() {
        this.balance = QUẤT_MONEY;
        this.currentBet = 0;
        this.selectedChoice = null; // 'tai' hoặc 'xiu'
        this.totalGames = 0; // dùng làm mã phiên
        this.totalWins = 0;
        this.totalProfit = 0;
        this.currentStreak = 0;
        this.maxStreak = 0;
        this.history = [];
        this.lastBetFormat = ''; // Lưu format gốc của người dùng (10%, 1k, etc.)

        this.initializeElements();
        this.loadGameData();
        this.updateDisplay();
        this.updateChoiceColors();

        // Đồng bộ kích thước hai ô kết quả (trái/phải)
        this.syncDicePanels();
        window.addEventListener('resize', () => this.syncDicePanels());

        // Hide sidebar; show top-left logo trigger to open it
        const sidebar = document.querySelector('.sidebar-nav');
        sidebar?.classList.add('hidden');
        const triggerImg = document.getElementById('menuTriggerLogo');
        if (triggerImg) {
            triggerImg.style.display = 'block';
            triggerImg.addEventListener('click', () => {
                if (sidebar?.classList.contains('hidden')) {
                    sidebar.classList.remove('hidden');
                    // ảnh vẫn giữ nguyên vị trí và không ẩn đi
                } else {
                    sidebar.classList.add('hidden');
                }
            });
        }
    }

    initializeElements() {
        this.balanceEl = document.getElementById('balanceDisplay');
        this.betAmountEl = document.getElementById('betAmount');
        this.taiBtn = document.getElementById('taiBtn');
        this.xiuBtn = document.getElementById('xiuBtn');
        this.playBtn = document.getElementById('playBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.historyToggle = document.getElementById('historyToggle');
        this.historyPopup = document.getElementById('historyPopup');
        this.historyClose = document.getElementById('historyClose');
        this.alertPopup = document.getElementById('alertPopup');
        this.alertMessage = document.getElementById('alertMessage');
        this.alertClose = document.getElementById('alertClose');
        this.confirmPopup = document.getElementById('confirmPopup');
        this.confirmMessage = document.getElementById('confirmMessage');
        this.confirmYes = document.getElementById('confirmYes');
        this.confirmNo = document.getElementById('confirmNo');
        this.resultEl = document.getElementById('result');
        this.diceResultEl = document.getElementById('diceResult');
        this.diceNumbersEl = document.getElementById('diceNumbers');
        this.diceInfoEl = document.getElementById('diceInfo');
        this.diceResultWrapEl = document.getElementById('diceResult');
        this.diceSumEl = document.getElementById('diceSum');
        this.totalGamesEl = document.getElementById('totalGames');
        this.totalWinsEl = document.getElementById('totalWins');
        this.currentStreakEl = document.getElementById('currentStreak');
        this.totalProfitEl = document.getElementById('totalProfit');
        this.taiRateEl = document.getElementById('taiRate');
        this.xiuRateEl = document.getElementById('xiuRate');
        this.historyListEl = document.getElementById('historyListPopup');

        this.betAmountEl.addEventListener('input', () => this.parseBetAmount());
        this.taiBtn.addEventListener('click', () => this.selectChoice('tai'));
        this.xiuBtn.addEventListener('click', () => this.selectChoice('xiu'));
        this.playBtn.addEventListener('click', () => this.play());
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.historyToggle.addEventListener('click', () => this.showHistory());
        this.historyClose.addEventListener('click', () => this.hideHistory());
        this.historyPopup.addEventListener('click', (e) => {
            if (e.target === this.historyPopup) {
                this.hideHistory();
            }
        });
        this.alertClose.addEventListener('click', () => this.hideAlert());
        this.alertPopup.addEventListener('click', (e) => {
            if (e.target === this.alertPopup) {
                this.hideAlert();
            }
        });
        this.confirmYes.addEventListener('click', () => this.confirmCallback(true));
        this.confirmNo.addEventListener('click', () => this.confirmCallback(false));
        this.confirmPopup.addEventListener('click', (e) => {
            if (e.target === this.confirmPopup) {
                this.confirmCallback(false);
            }
        });

        // Sidebar navigation event listeners
        document.getElementById('gameLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.setActiveNavItem('gameLink');
        });
        document.getElementById('statsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.setActiveNavItem('statsLink');
            window.location.href = 'html/stats.html';
        });
        document.getElementById('settingsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.setActiveNavItem('settingsLink');
            this.showSettings();
        });
        document.getElementById('helpLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.setActiveNavItem('helpLink');
            this.showHelp();
        });

        // Khi ảnh xúc xắc tải xong, đồng bộ lại chiều cao
        ['d1','d2','d3'].forEach(id => {
            const img = document.getElementById(id);
            if (img) {
                img.addEventListener('load', () => this.syncDicePanels());
            }
        });
    }

    // Đồng bộ #diceInfo và #diceNumbers: dùng chiều cao lớn nhất (tính cả border)
    syncDicePanels() {
        const numbersEl = this.diceNumbersEl;
        const infoEl = this.diceInfoEl;
        const resultWrap = this.diceResultWrapEl;
        if (!numbersEl || !infoEl || !resultWrap) return;

        // Reset trước khi đo để tránh tích lũy chiều cao
        infoEl.style.height = '';
        resultWrap.style.height = '';

        // Đợi layout ổn định rồi đo
        requestAnimationFrame(() => {
            const hNumbers = Math.ceil(numbersEl.getBoundingClientRect().height);
            const hInfo = Math.ceil(infoEl.getBoundingClientRect().height);
            const hResult = Math.ceil(resultWrap.getBoundingClientRect().height);
            const h = Math.max(hNumbers, hInfo, hResult);
            if (h > 0) {
                infoEl.style.height = h + 'px';
                resultWrap.style.height = h + 'px';
            }
        });
    }

    parseBetAmount() {
        const previousValid = this.currentBet || 0;
        const raw = this.betAmountEl.value.trim().toLowerCase();
        if (raw === '') { 
            this.currentBet = 0; 
            this.lastBetFormat = ''; // Xóa format khi input trống
            this.saveGameData(); // Lưu ngay khi xóa input
            if (this.playBtn) { 
                this.playBtn.disabled = true; 
                this.playBtn.textContent = '🎲 Nhập số tiền để chơi'; 
            } 
            return; 
        }

        // Chỉ cho phép định dạng: số + (tùy chọn) 1 trong các hậu tố [k|m|b|%]
        // Không cho phép ký tự khác, không cho phép nhiều hậu tố
        const valid = /^([0-9]+(?:\.[0-9]+)?)([kmb%])?$/i;
        const match = valid.exec(raw);
        if (!match) {
            // Không nhận input sai: revert về giá trị hợp lệ gần nhất
            this.betAmountEl.value = previousValid ? String(previousValid) : '';
            this.currentBet = previousValid;
            return;
        }

        const numPart = parseFloat(match[1]);
        const suffix = (match[2] || '').toLowerCase();
        let bet = 0;

        if (suffix === '%') {
            if (numPart <= 0 || numPart > 100) {
                this.betAmountEl.value = previousValid ? String(previousValid) : '';
                this.currentBet = previousValid;
                return;
            }
            bet = Math.round((this.balance * numPart) / 100);
        } else if (suffix === 'k') {
            bet = Math.round(numPart * 1_000);
        } else if (suffix === 'm') {
            bet = Math.round(numPart * 1_000_000);
        } else if (suffix === 'b') {
            bet = Math.round(numPart * 1_000_000_000);
        } else {
            bet = Math.round(numPart);
        }

        if (bet < 1) {
            this.betAmountEl.value = previousValid ? String(previousValid) : '';
            this.currentBet = previousValid;
            return;
        }

        if (bet > this.balance) {
            // clamp mà không alert
            bet = this.balance;
        }

        this.currentBet = bet;
        this.lastBetFormat = raw; // Lưu format gốc
        
        // Cập nhật lại input field để hiển thị giá trị đã tính toán
        if (suffix === '%') {
            // Giữ nguyên format % trong input
            this.betAmountEl.value = raw;
        } else {
            // Hiển thị số tiền đã tính toán cho các format khác
            this.betAmountEl.value = bet.toLocaleString();
        }
        
        this.updateDisplay();
        // Cho chơi nếu đã chọn cửa và có cược hợp lệ
        if (this.selectedChoice) {
            this.playBtn.disabled = false;
            this.playBtn.textContent = '🎲 Chơi ngay';
        }
    }

    selectChoice(choice) {
        if (this._rolling) return; // đang lắc: không cho đổi lựa chọn
        this.selectedChoice = choice;

        // Cập nhật UI
        this.taiBtn.classList.remove('selected');
        this.xiuBtn.classList.remove('selected');

        if (choice === 'tai') {
            this.taiBtn.classList.add('selected');
        } else {
            this.xiuBtn.classList.add('selected');
        }

        // Enable play button nếu đã có tiền cược hợp lệ
        if (this.currentBet > 0) {
            this.playBtn.disabled = false;
            this.playBtn.textContent = '🎲 Chơi ngay';
        } else {
            this.playBtn.disabled = true;
            this.playBtn.textContent = '🎲 Nhập số tiền để chơi';
        }
    }

    resetGame() {
                this.showConfirm('Bạn có chắc muốn reset game? Tất cả dữ liệu sẽ bị xóa!', '🔄', (confirmed) => {
            this.hideConfirm();
            if (confirmed) {
                // Reset tất cả dữ liệu
                this.balance = QUẤT_MONEY;
                this.currentBet = 0;
                this.selectedChoice = null;
                this.totalGames = 0;
                this.totalWins = 0;
                this.totalProfit = 0;
                this.currentStreak = 0;
                this.maxStreak = 0;
                this.history = [];
                this.lastBetFormat = '';

                // Reset UI
                if (this.betAmountEl) {
                    this.betAmountEl.value = '';
                }
                this.taiBtn.classList.remove('selected');
                this.xiuBtn.classList.remove('selected');
                this.playBtn.disabled = true;
                this.playBtn.textContent = '🎲 Chọn cửa để chơi';
                // Giữ khung hiển thị, ẩn ảnh để không vỡ layout
                this.diceResultEl.style.display = 'block';
                if (this.diceNumbersEl && !this.diceNumbersEl.classList.contains('hidden-dice')) {
                    this.diceNumbersEl.classList.add('hidden-dice');
                }
                if (this.diceSumEl) {
                    this.diceSumEl.innerHTML = '';
                }
                if (this.resultEl) {
                    this.resultEl.textContent = 'Chọn cửa Tài hoặc Xỉu để bắt đầu!';
                    this.resultEl.className = 'result';
                }

                // Cập nhật hiển thị
                this.updateDisplay();
                this.updateHistory();
                this.updateChoiceColors();
                this.updateTaiXiuRate();

                // Xóa dữ liệu localStorage
                localStorage.removeItem('bomwinGameData');

                this.showAlert('Game đã được reset!', '✅');
                // Reset nút play state
                this._rolling = false;
            }
        });
    }

    play() {
        if (this.currentBet > this.balance) {
            this.showAlert('Không đủ tiền để chơi!', '💰');
            return;
        }

        if (!this.selectedChoice) {
            this.showAlert('Vui lòng chọn Tài hoặc Xỉu!', '🎯');
            return;
        }

        // Chặn double click: nếu đang xử lý thì bỏ qua
        if (this._rolling) return;
        this._rolling = true;
        this.playBtn.disabled = true;
        this.playBtn.textContent = 'Đang tung xúc sắc...';
        // khóa các nút chọn cửa khi đang lắc
        if (this.taiBtn) this.taiBtn.disabled = true;
        if (this.xiuBtn) this.xiuBtn.disabled = true;

        // Hiệu ứng random xúc xắc mỗi 0.2s
        const d1Img = document.getElementById('d1');
        const d2Img = document.getElementById('d2');
        const d3Img = document.getElementById('d3');
        // Hiện xúc xắc ngay khi bắt đầu roll (tránh lần đầu không thấy animation)
        if (this.diceNumbersEl && this.diceNumbersEl.classList.contains('hidden-dice')) {
            this.diceNumbersEl.classList.remove('hidden-dice');
        }
        if (this._rollInterval) clearInterval(this._rollInterval);
        this._rollInterval = setInterval(() => {
            const r1 = Math.floor(Math.random() * 6) + 1;
            const r2 = Math.floor(Math.random() * 6) + 1;
            const r3 = Math.floor(Math.random() * 6) + 1;
            if (d1Img) d1Img.src = `stream/${r1}.png`;
            if (d2Img) d2Img.src = `stream/${r2}.png`;
            if (d3Img) d3Img.src = `stream/${r3}.png`;
        }, 1);

        // Hiệu ứng loading
        setTimeout(() => {
            try {
                const result = this.calculateResult();
                this.processResult(result);
            } catch (err) {
                console.error('Lỗi khi xử lý kết quả:', err);
                this.showAlert('Có lỗi xảy ra khi tung xúc xắc. Vui lòng thử lại.', '⚠️');
            } finally {
                if (this._rollInterval) { clearInterval(this._rollInterval); this._rollInterval = null; }
                this.playBtn.disabled = false;
                this.playBtn.textContent = '🎲 Chơi ngay';
                this._rolling = false;
                // mở khóa chọn cửa sau khi lắc xong
                if (this.taiBtn) this.taiBtn.disabled = false;
                if (this.xiuBtn) this.xiuBtn.disabled = false;
                // đảm bảo màu cuối cùng đúng theo dữ liệu
                this.updateChoiceColors();
                this.syncDicePanels();
            }
        }, 2000);
    }

    calculateResult() {
        // Tung 3 xúc sắc
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const dice3 = Math.floor(Math.random() * 6) + 1;
        const sum = dice1 + dice2 + dice3;

        // Kiểm tra trùng số (3 xúc sắc cùng số)
        const isTriple = (dice1 === dice2 && dice2 === dice3);

        // Xác định kết quả tài xỉu
        const isTai = sum >= 11; // Tài: 11-18, Xỉu: 3-10
        const isWin = (this.selectedChoice === 'tai' && isTai) ||
            (this.selectedChoice === 'xiu' && !isTai);

        // Lưu kết quả xúc sắc
        this.diceResult = {
            dice1, dice2, dice3, sum, isTai, isWin, isTriple
        };

        if (isWin) {
            let winAmount = this.currentBet; // Tỷ lệ 1:1 cơ bản
            let message = `🎉 Thắng! +${winAmount.toLocaleString()} VND`;

            // Nếu trùng số thì nhận x3
            if (isTriple) {
                winAmount = this.currentBet * 3;
                message = `🎊 TRÙNG SỐ! +${winAmount.toLocaleString()} VND (x3)`;
            }

            const res = {
                isWin: true,
                amount: winAmount,
                message: message
            };
            // cập nhật màu theo kết quả ngay từ lần đầu
            this.previewChoiceColors(sum);
            return res;
        } else {
            // Thua: mất số tiền cược
            const res = {
                isWin: false,
                amount: -this.currentBet,
                message: `😢 Thua! -${this.currentBet.toLocaleString()} VND`
            };
            this.previewChoiceColors(sum);
            return res;
        }
    }

    // Cập nhật màu dựa trên tổng điểm của lần tung hiện tại (trước khi lưu lịch sử)
    previewChoiceColors(sum) {
        const isTai = sum >= 11;
        if (!this.taiBtn || !this.xiuBtn) return;
        this.taiBtn.classList.remove('btn-green','btn-red','btn-yellow');
        this.xiuBtn.classList.remove('btn-green','btn-red','btn-yellow');
        if (this.history.length === 0) {
            // lần đầu: tô theo kết quả ngay
            if (isTai) { this.taiBtn.classList.add('btn-green'); this.xiuBtn.classList.add('btn-red'); }
            else { this.xiuBtn.classList.add('btn-green'); this.taiBtn.classList.add('btn-red'); }
            return;
        }
        // nếu đã có lịch sử, vẫn cộng kết quả hiện tại để preview đúng
        let taiCount = 0, xiuCount = 0;
        this.history.forEach(h => { if (Number(h.sum) >= 11) taiCount++; else xiuCount++; });
        if (isTai) taiCount++; else xiuCount++;
        if (taiCount > xiuCount) { this.taiBtn.classList.add('btn-green'); this.xiuBtn.classList.add('btn-red'); }
        else if (xiuCount > taiCount) { this.xiuBtn.classList.add('btn-green'); this.taiBtn.classList.add('btn-red'); }
        else { this.taiBtn.classList.add('btn-yellow'); this.xiuBtn.classList.add('btn-yellow'); }
    }

    processResult(result) {
        this.balance += result.amount;
        this.totalGames++;
        this.totalProfit += result.amount;

        if (result.isWin) {
            this.totalWins++;
            this.currentStreak = (this.currentStreak >= 0 ? this.currentStreak + 1 : 1);
            this.currentLoseStreak = 0;
            if (this.currentStreak > this.maxStreak) {
                this.maxStreak = this.currentStreak;
            }
        } else {
            this.currentStreak = (this.currentStreak <= 0 ? this.currentStreak - 1 : -1);
            this.currentLoseStreak = Math.abs(this.currentStreak);
        }

        // Cập nhật lịch sử trước để số liệu ngay lập tức phản ánh đúng
        this.addToHistory(result);
        // Cập nhật hiển thị (bao gồm Tài/Xỉu %) sau khi đã thêm lịch sử
        this.updateDisplay();
        this.showResult(result);
        // cập nhật màu theo dữ liệu thực tế
        this.updateChoiceColors();

        // Tự động cập nhật lại số cược nếu đang dùng %
        this.updateBetIfPercent();

        this.saveGameData();

        // Hiệu ứng (nếu có phần tử result)
        if (this.resultEl) {
            this.resultEl.classList.add('pulse');
            setTimeout(() => this.resultEl.classList.remove('pulse'), 500);
        }
    }

    updateBetIfPercent() {
        // Nếu có format gốc là %, tính lại với balance mới
        if (this.lastBetFormat && this.lastBetFormat.includes('%')) {
            this.betAmountEl.value = this.lastBetFormat;
            this.parseBetAmount();
        }
    }

    showResult(result) {
        // Hiển thị kết quả xúc sắc
        this.diceResultEl.style.display = 'block';
        // Hiện xúc xắc lần đầu (nếu đang ẩn)
        if (this.diceNumbersEl && this.diceNumbersEl.classList.contains('hidden-dice')) {
            this.diceNumbersEl.classList.remove('hidden-dice');
        }

        // Reset màu về bình thường trước
        this.diceNumbersEl.style.color = '';
        this.diceNumbersEl.style.textShadow = '';

        // Hiệu ứng đặc biệt cho trùng số
        if (this.diceResult.isTriple) {
            this.diceNumbersEl.style.color = '#FFD700';
            this.diceNumbersEl.style.textShadow = '0 0 10px #FFD700';
            this.diceNumbersEl.style.fontSize = '2.5rem';
        } else {
            this.diceNumbersEl.style.fontSize = '2rem';
        }

        const d1Img = document.getElementById('d1');
        const d2Img = document.getElementById('d2');
        const d3Img = document.getElementById('d3');
        if (d1Img) d1Img.src = `stream/${this.diceResult.dice1}.png`;
        if (d2Img) d2Img.src = `stream/${this.diceResult.dice2}.png`;
        if (d3Img) d3Img.src = `stream/${this.diceResult.dice3}.png`;

        // Sau khi cập nhật ảnh, đồng bộ lại chiều cao
        this.syncDicePanels();

        const choiceLabel = this.selectedChoice === 'tai' ? 'TÀI' : 'XỈU';
        const outcomeLabel = this.diceResult.isTai ? 'TÀI' : 'XỈU';
        const winLoseText = result.isWin ? '<span class="win-text">Bạn thắng</span>' : '<span class="lose-text">Bạn thua</span>';
        const headline = result.isWin ? '<div class="headline win-text">Bạn thắng</div>' : '<div class="headline lose-text">Bạn thua</div>';
        const moneyText = result.isWin ? `<span class="money win-text">+${result.amount.toLocaleString()} VND</span>` : `<span class="money lose-text">${result.amount.toLocaleString()} VND</span>`;
        const bonusInline = (this.diceResult.isTriple && result.isWin) ? `<span style="color:#FFD700; font-weight:800; margin-left:10px;">🎊 BONUS x3! 🎊</span>` : '';
        this.diceSumEl.innerHTML = `
                    ${headline}
                    <div class="line"><strong>Tổng:</strong> ${this.diceResult.sum.toLocaleString()} - ${outcomeLabel} (${this.diceResult.dice1}, ${this.diceResult.dice2}, ${this.diceResult.dice3})</div>
                    <div class="line"><strong>Bạn chọn:</strong> ${choiceLabel}</div>
                    <div class="line">${moneyText} ${bonusInline}</div>
                `;

        // Hiển thị kết quả (nếu phần tử tồn tại)
        if (this.resultEl) {
            // Reset mọi style inline trước đó (tránh giữ lại màu vàng của trùng số)
            this.resultEl.style.background = '';
            this.resultEl.style.border = '';
            this.resultEl.style.animation = '';

            this.resultEl.textContent = result.message;
            this.resultEl.className = `result ${result.isWin ? 'win' : 'lose'}`;

            // Hiệu ứng đặc biệt cho trùng số
            if (this.diceResult.isTriple) {
                this.resultEl.style.background = 'rgba(255, 215, 0, 0.3)';
                this.resultEl.style.border = '3px solid #FFD700';
                this.resultEl.style.animation = 'pulse 1s ease-in-out infinite';
            }
        }
    }

    addToHistory(result) {
        const historyItem = {
            roundId: this.totalGames,
            timestamp: new Date().toISOString(),
            bet: this.currentBet,
            choice: this.selectedChoice, // 'tai' | 'xiu'
            dice: [this.diceResult.dice1, this.diceResult.dice2, this.diceResult.dice3],
            sum: this.diceResult.sum,
            won: result.isWin,
            amount: result.amount,
            isTriple: this.diceResult.isTriple
        };

        this.history.unshift(historyItem);

        this.updateHistory();
        this.updateHistoryWinrate();
    }

    updateHistory() {
        const historyListEl = document.getElementById('historyListPopup');
        historyListEl.innerHTML = '';

        this.history.forEach(item => {
            const row = document.createElement('tr');

            let timeText;
            try {
                timeText = new Date(item.timestamp).toLocaleTimeString('vi-VN');
            } catch {
                timeText = item.timestamp;
            }

            const totalBetText = item.bet.toLocaleString('vi-VN');
            const winText = (item.amount >= 0 ? '+' : '') + item.amount.toLocaleString('vi-VN');
            const winClass = item.amount >= 0 ? 'result-win' : 'result-lose';
            const isTai = Number(item.sum) >= 11;
            const detailText = `Bạn đặt cửa ${item.choice === 'tai' ? 'Tài' : 'Xỉu'}. ` +
                `Kết quả xúc xắc: ` +
                `<span class="die1">${item.dice[0]}</span> – ` +
                `<span class="die2">${item.dice[1]}</span> – ` +
                `<span class="die3">${item.dice[2]}</span>. ` +
                `Tổng điểm ${item.sum}.` +
                `${item.isTriple && item.won ? ' Trúng trùng số x3!' : ''}`;

            row.innerHTML = `
                        <td>${item.roundId || ''}</td>
                        <td>${timeText}</td>
                        <td>${totalBetText}</td>
                        <td class="${winClass}">${winText}</td>
                        <td>${detailText}</td>
                    `;

            historyListEl.appendChild(row);
        });
    }

    updateHistoryWinrate() {
        const total = this.history.length;
        const wins = this.history.filter(h => h.won).length;
        const rate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
        const el = document.getElementById('historyWinrate');
        if (el) {
            el.textContent = `Tỉ lệ thắng: ${rate}% (${wins}/${total})`;
            el.classList.remove('rate-green','rate-red','rate-yellow');
            const r = parseFloat(rate);
            if (r > 50) el.classList.add('rate-green');
            else if (r === 50) el.classList.add('rate-yellow');
            else el.classList.add('rate-red');
        }
    }

    updateDisplay() {
        this.balanceEl.textContent = `💰 ${this.balance.toLocaleString()} VND`;
        this.totalGamesEl.textContent = this.totalGames.toLocaleString();
        this.totalWinsEl.textContent = this.totalWins.toLocaleString();
        // Tính tỉ lệ Tài/Xỉu
        this.updateTaiXiuRate();
        this.totalProfitEl.textContent = this.totalProfit.toLocaleString();

        // Cập nhật màu sắc + nhãn cho tổng lãi/lỗ
        const profitLabel = document.getElementById('totalProfitLabel');
        if (this.totalProfit > 0) {
            this.totalProfitEl.style.color = '#4CAF50';
            if (profitLabel) profitLabel.textContent = 'Lãi';
        } else if (this.totalProfit < 0) {
            this.totalProfitEl.style.color = '#f44336';
            if (profitLabel) profitLabel.textContent = 'Lỗ';
        } else {
            this.totalProfitEl.style.color = '#FFD700';
            if (profitLabel) profitLabel.textContent = 'Lãi/Lỗ';
        }

        // Streak UI đã thay bằng tỉ lệ Tài/Xỉu; bỏ cập nhật màu để tránh lỗi khi phần tử không tồn tại
    }

    updateTaiXiuRate() {
        if (!this.taiRateEl || !this.xiuRateEl) return;
        const total = this.history.length;
        // reset màu
        this.taiRateEl.classList.remove('rate-green','rate-red','rate-yellow');
        this.xiuRateEl.classList.remove('rate-green','rate-red','rate-yellow');
        if (total === 0) {
            this.taiRateEl.textContent = 'Tài: 0% (0 lần)';
            this.xiuRateEl.textContent = 'Xỉu: 0% (0 lần)';
            this.taiRateEl.classList.add('rate-yellow');
            this.xiuRateEl.classList.add('rate-yellow');
            return;
        }
        let taiCount = 0;
        let xiuCount = 0;
        this.history.forEach(h => { if (Number(h.sum) >= 11) taiCount++; else xiuCount++; });
        const taiRate = ((taiCount / total) * 100).toFixed(1);
        const xiuRate = ((xiuCount / total) * 100).toFixed(1);
        this.taiRateEl.textContent = `Tài: ${taiRate}% (${taiCount} lần)`;
        this.xiuRateEl.textContent = `Xỉu: ${xiuRate}% (${xiuCount} lần)`;

        if (taiCount === xiuCount) {
            this.taiRateEl.classList.add('rate-yellow');
            this.xiuRateEl.classList.add('rate-yellow');
        } else if (taiCount > xiuCount) {
            this.taiRateEl.classList.add('rate-green');
            this.xiuRateEl.classList.add('rate-red');
        } else {
            this.xiuRateEl.classList.add('rate-green');
            this.taiRateEl.classList.add('rate-red');
        }
    }

    // Cập nhật màu TÀI/XỈU theo tần suất xuất hiện trong lịch sử
    updateChoiceColors() {
        const total = this.history.length;
        if (!this.taiBtn || !this.xiuBtn) return;
        // reset
        this.taiBtn.classList.remove('btn-green','btn-red','btn-yellow');
        this.xiuBtn.classList.remove('btn-green','btn-red','btn-yellow');

        if (total === 0) {
            this.taiBtn.classList.add('btn-yellow');
            this.xiuBtn.classList.add('btn-yellow');
            return;
        }
        let taiCount = 0;
        let xiuCount = 0;
        this.history.forEach(h => { if (Number(h.sum) >= 11) taiCount++; else xiuCount++; });

        if (taiCount > xiuCount) {
            this.taiBtn.classList.add('btn-green');
            this.xiuBtn.classList.add('btn-red');
        } else if (xiuCount > taiCount) {
            this.xiuBtn.classList.add('btn-green');
            this.taiBtn.classList.add('btn-red');
        } else {
            this.taiBtn.classList.add('btn-yellow');
            this.xiuBtn.classList.add('btn-yellow');
        }
    }

    saveGameData() {
        const gameData = {
            balance: this.balance,
            totalGames: this.totalGames,
            totalWins: this.totalWins,
            totalProfit: this.totalProfit,
            currentStreak: this.currentStreak,
            maxStreak: this.maxStreak,
            history: this.history,
            lastBetFormat: this.lastBetFormat,
            lastPlayed: new Date().toISOString()
        };

        localStorage.setItem('bomwinGameData', JSON.stringify(gameData));
    }

    loadGameData() {
        const savedData = localStorage.getItem('bomwinGameData');
        if (savedData) {
            try {
                const gameData = JSON.parse(savedData);
                this.balance = gameData.balance !== undefined ? gameData.balance : QUẤT_MONEY;
                this.totalGames = gameData.totalGames || 0;
                this.totalWins = gameData.totalWins || 0;
                this.totalProfit = gameData.totalProfit || 0;
                this.currentStreak = gameData.currentStreak || 0;
                this.maxStreak = gameData.maxStreak || 0;
                this.history = gameData.history || [];
                this.lastBetFormat = gameData.lastBetFormat || '';
                
                // Khôi phục input field với format đã lưu (chỉ khi có format hợp lệ)
                if (this.lastBetFormat && this.lastBetFormat.trim() !== '' && this.betAmountEl) {
                    this.betAmountEl.value = this.lastBetFormat;
                    this.parseBetAmount();
                }
            } catch (e) {
                console.log('Không thể load dữ liệu game');
            }
        }
    }


    showHistory() {
        this.historyPopup.classList.add('show');
        this.updateHistory();
        this.updateHistoryWinrate();
    }

    hideHistory() {
        this.historyPopup.classList.remove('show');
    }

    showAlert(message, icon = '⚠️') {
        this.alertMessage.textContent = message;
        this.alertPopup.querySelector('.alert-icon').textContent = icon;
        this.alertPopup.classList.add('show');
    }

    hideAlert() {
        this.alertPopup.classList.remove('show');
    }

    showConfirm(message, icon = '❓', callback) {
        this.confirmMessage.textContent = message;
        this.confirmPopup.querySelector('.alert-icon').textContent = icon;
        this.confirmPopup.classList.add('show');
        this.confirmCallback = callback;
    }

    hideConfirm() {
        this.confirmPopup.classList.remove('show');
    }

    // Sidebar navigation methods
    setActiveNavItem(activeId) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        // Add active class to clicked item
        document.getElementById(activeId).closest('.nav-item').classList.add('active');
    }

    showStats() { /* no-op: stats now opens in new page */ }

    showSettings() {
        this.showAlert('⚙️ Cài đặt\n\n' +
            '• Âm thanh: Bật/Tắt\n' +
            '• Hiệu ứng: Bật/Tắt\n' +
            '• Chế độ tối: Bật/Tắt\n' +
            '• Ngôn ngữ: Tiếng Việt\n\n' +
            'Các tính năng này sẽ được cập nhật trong phiên bản tiếp theo!', '⚙️');
    }

    showHelp() {
        this.showAlert('❓ Trợ giúp\n\n' +
            '🎯 Cách chơi:\n' +
            '• Chọn Tài (11-18) hoặc Xỉu (3-10)\n' +
            '• Nhập số tiền cược\n' +
            '• Nhấn "Tung xúc sắc"\n\n' +
            '💰 Cách cược:\n' +
            '• Số: 1000, 5000\n' +
            '• K/M/B: 1k, 2m, 3b\n' +
            '• Phần trăm: 20%, 50%\n\n' +
            '🎁 Phần thưởng:\n' +
            '• Thắng thường: x1\n' +
            '• Trùng số: x3', '❓');
    }
}

// Khởi tạo game khi trang load
document.addEventListener('DOMContentLoaded', () => {
    new BomWinGame();
});