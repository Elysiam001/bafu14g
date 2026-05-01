class GameTimer {
    constructor(duration, displayElement, onFinish) {
        this.duration = duration;
        this.timeLeft = duration;
        this.displayElement = displayElement;
        this.onFinish = onFinish;
        this.interval = null;
    }

    start() {
        this.stop();
        this.timeLeft = this.duration;
        this.updateDisplay();
        
        this.interval = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            
            if (this.timeLeft <= 3 && this.timeLeft > 0) {
                this.displayElement.classList.add('timer-warning');
            } else {
                this.displayElement.classList.remove('timer-warning');
            }

            if (this.timeLeft <= 0) {
                this.stop();
                if (this.onFinish) this.onFinish();
            }
        }, 1000);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
        this.displayElement.classList.remove('timer-warning');
    }

    updateDisplay() {
        const text = this.timeLeft < 10 ? '0' + this.timeLeft : this.timeLeft;
        this.displayElement.innerText = text;
    }
}

window.GameTimer = GameTimer;
