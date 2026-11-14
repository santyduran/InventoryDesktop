import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_ACCOUNT = 5;
const MAX_FAILURES_PER_IP = 20;

interface Counter {
  failures: number;
  windowStart: number;
  blockedUntil: number;
}

/**
 * Limita los intentos fallidos de inicio de sesión para frenar a quien
 * intente adivinar contraseñas: 5 fallos por cuenta e IP, o 20 por IP,
 * bloquean durante 15 minutos. Vive en memoria (una sola instancia).
 */
@Injectable()
export class LoginThrottleService {
  private readonly counters = new Map<string, Counter>();

  private keys(ip: string, username: string): [string, number][] {
    return [
      [`cuenta:${ip}:${username}`, MAX_FAILURES_PER_ACCOUNT],
      [`ip:${ip}`, MAX_FAILURES_PER_IP],
    ];
  }

  /** Lanza 429 si la combinación está bloqueada. */
  assertAllowed(ip: string, username: string): void {
    const now = Date.now();

    for (const [key] of this.keys(ip, username)) {
      const counter = this.counters.get(key);

      if (counter && counter.blockedUntil > now) {
        const minutes = Math.ceil((counter.blockedUntil - now) / 60000);

        throw new HttpException(
          `Demasiados intentos fallidos. Intenta de nuevo en ${minutes} minuto${minutes === 1 ? '' : 's'}.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  registerFailure(ip: string, username: string): void {
    const now = Date.now();
    this.cleanup(now);

    for (const [key, limit] of this.keys(ip, username)) {
      const counter = this.counters.get(key);

      if (!counter || now - counter.windowStart > WINDOW_MS) {
        this.counters.set(key, { failures: 1, windowStart: now, blockedUntil: 0 });
        continue;
      }

      counter.failures += 1;

      if (counter.failures >= limit) {
        counter.blockedUntil = now + WINDOW_MS;
      }
    }
  }

  registerSuccess(ip: string, username: string): void {
    this.counters.delete(`cuenta:${ip}:${username}`);
  }

  private cleanup(now: number): void {
    for (const [key, counter] of this.counters) {
      if (counter.blockedUntil < now && now - counter.windowStart > WINDOW_MS) {
        this.counters.delete(key);
      }
    }
  }
}
