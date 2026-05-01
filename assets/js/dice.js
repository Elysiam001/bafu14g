class GameDice {
    constructor(diceContainer) {
        this.container = diceContainer;
        this.diceElements = diceContainer.querySelectorAll('i');
    }

    startRolling() {
        this.container.style.display = 'flex';
        this.diceElements.forEach(dice => {
            dice.classList.add('rolling');
            // Random vị trí nhẹ bên trong bát
            const rx = Math.random() * 20 - 10;
            const ry = Math.random() * 20 - 10;
            dice.style.transform = `translate(${rx}px, ${ry}px)`;
        });
    }

    stopRolling(results) {
        this.container.style.display = 'flex'; // Đảm bảo container được hiển thị
        this.diceElements.forEach((dice, index) => {
            dice.classList.remove('rolling');
            dice.className = this.getDiceClass(results[index]);
            dice.classList.add('dice-pop-final');
            dice.style.transform = 'translate(0,0)';
        });
    }

    getDiceClass(value) {
        const icons = [
            'fas fa-dice-one',
            'fas fa-dice-two',
            'fas fa-dice-three',
            'fas fa-dice-four',
            'fas fa-dice-five',
            'fas fa-dice-six'
        ];
        return icons[value - 1];
    }

    hide() {
        this.container.style.display = 'none';
    }

    show() {
        this.container.style.display = 'flex';
    }
}

window.GameDice = GameDice;
