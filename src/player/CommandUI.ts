import { CommandSystem, CommandContext } from '../core/CommandSystem';

export class CommandUI {
    private container: HTMLElement;
    private input: HTMLInputElement;
    private log: HTMLElement;
    private commandSystem: CommandSystem;
    private isOpen: boolean = false;
    private onToggleCallback: (open: boolean) => void = () => {};
    private contextProvider: () => CommandContext;

    constructor(commandSystem: CommandSystem, contextProvider: () => CommandContext) {
        this.commandSystem = commandSystem;
        this.contextProvider = contextProvider;

        // Create UI elements
        this.container = document.createElement('div');
        this.container.id = 'command-ui';

        this.log = document.createElement('div');
        this.log.id = 'command-log';
        this.container.appendChild(this.log);

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.placeholder = 'Enter command...';
        this.container.appendChild(this.input);

        this.applyStyles();

        document.body.appendChild(this.container);

        // Events
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const command = this.input.value.trim();
                if (command) {
                    this.addLog(`> ${command}`);
                    const response = this.commandSystem.execute(command, this.contextProvider());
                    this.addLog(response);
                    this.input.value = '';
                }
                this.toggle(false);
            } else if (e.key === 'Escape') {
                this.toggle(false);
            }
        });
    }

    private applyStyles() {
        Object.assign(this.container.style, {
            position: 'absolute',
            bottom: '100px',
            left: '20px',
            width: '400px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            fontFamily: 'monospace',
            padding: '10px',
            display: 'none',
            flexDirection: 'column',
            borderRadius: '4px',
            zIndex: '1000'
        });

        Object.assign(this.log.style, {
            maxHeight: '200px',
            overflowY: 'auto',
            marginBottom: '10px',
            fontSize: '14px'
        });

        Object.assign(this.input.style, {
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            padding: '5px',
            outline: 'none',
            fontSize: '14px'
        });
    }

    public setOnToggle(callback: (open: boolean) => void) {
        this.onToggleCallback = callback;
    }

    public toggle(show: boolean) {
        this.isOpen = show;
        this.container.style.display = show ? 'flex' : 'none';
        if (show) {
            this.input.focus();
            this.input.value = '/';
        }
        this.onToggleCallback(show);
    }

    public addLog(message: string) {
        const entry = document.createElement('div');
        entry.textContent = message;
        this.log.appendChild(entry);
        this.log.scrollTop = this.log.scrollHeight;

        // Auto hide log after 5 seconds if UI is closed
        if (!this.isOpen) {
            this.container.style.display = 'flex';
            this.input.style.display = 'none';
            setTimeout(() => {
                if (!this.isOpen) {
                    this.container.style.display = 'none';
                    this.input.style.display = 'block';
                }
            }, 5000);
        }
    }

    public isFocused(): boolean {
        return this.isOpen;
    }
}
