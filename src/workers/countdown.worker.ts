/// <reference lib="webworker" />
import { initialCountdown, setTarget, tick } from '../lib/countdown';

type Message = { type: 'target'; minutes: number } | { type: 'stop' };

let state = initialCountdown();
let timer: ReturnType<typeof setInterval> | null = null;

function emit(): void {
  postMessage({ seconds: state.displayedSeconds });
}

self.onmessage = (event: MessageEvent<Message>) => {
  const message = event.data;
  if (message.type === 'stop') {
    if (timer) {
      clearInterval(timer);
    }
    self.close();
    return;
  }
  state = setTarget(state, message.minutes, Date.now());
  emit();
  if (!timer) {
    timer = setInterval(() => {
      state = tick(state, Date.now());
      emit();
    }, 1000);
  }
};

export {};
