export class PID {
    private integral: number = 0;
    private prevError: number = 0;

    constructor(
        private kp: number,
        private ki: number,
        private kd: number,
        private min: number = -Infinity,
        private max: number = Infinity
    ) { }

    public update(error: number, dt: number): number {
        this.integral += error * dt;

        // Anti-windup clamping on integral?
        // Simple implementation:

        const derivative = (error - this.prevError) / dt;
        this.prevError = error;

        let output = this.kp * error + this.ki * this.integral + this.kd * derivative;

        // Output clamping
        if (output > this.max) output = this.max;
        if (output < this.min) output = this.min;

        return output;
    }

    public reset() {
        this.integral = 0;
        this.prevError = 0;
    }
}
