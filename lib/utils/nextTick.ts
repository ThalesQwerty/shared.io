export function nextTick(numTicks = 1) {
    let totalTicks = 0;
    return new Promise<void>(function(resolve) {
        const oneMoreTick = () => {
            totalTicks++;
            if (totalTicks > numTicks) resolve();
            else process.nextTick(() => oneMoreTick());
        };
        oneMoreTick();
    })
}