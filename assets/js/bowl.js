class GameBowl {
    constructor(bowlElement) {
        this.bowl = bowlElement;
    }

    close() {
        this.bowl.classList.remove('opening');
        this.bowl.classList.add('closing');
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    shake() {
        this.bowl.classList.add('shaking');
        return new Promise(resolve => setTimeout(resolve, 2000));
    }

    stopShaking() {
        this.bowl.classList.remove('shaking');
    }

    open() {
        this.bowl.classList.remove('closing');
        this.bowl.classList.add('opening');
        return new Promise(resolve => setTimeout(resolve, 800));
    }

    reset() {
        this.bowl.classList.remove('opening', 'closing', 'shaking');
    }
}

window.GameBowl = GameBowl;
