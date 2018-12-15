import showCanary from "../src/show-canary";

// create an array of 1000 user ids
const users = Array.apply(null, { length: 10000 }).map((_, i) => `user_${i}`);

it("Consistently makes same assignment for same userId.salt & same weight", () => {
    const firstRun = users.map(userId => showCanary(`${userId}.a`, 50));
    const secondRun = users.map(userId => showCanary(`${userId}.a`, 50));

    expect(firstRun).toEqual(secondRun);
});

it("If weight is 0, no one gets the canary", () => {
    const run1 = users
        .map(userId => showCanary(`${userId}.a`, 0))
        .filter(x => x);

    expect(run1.length).toBe(0);
});

it("If weight is 100, everyone gets the canary", () => {
    const run1 = users
        .map(userId => showCanary(`${userId}.a`, 100))
        .filter(x => x);

    expect(run1.length).toBe(10000);
});

it("Provides proper (approximately) weighted assignments", () => {
    const run2 = users.map(userId => showCanary(`${userId}.a`, 10));
    const run3 = users.map(userId => showCanary(`${userId}.a`, 25));
    const run4 = users.map(userId => showCanary(`${userId}.a`, 50));
    const run5 = users.map(userId => showCanary(`${userId}.a`, 75));

    expect(Math.round(run2.filter(x => x).length / 100, 0)).toBe(10);
    expect(Math.round(run3.filter(x => x).length / 100, 0)).toBe(25);
    expect(Math.round(run4.filter(x => x).length / 100, 0)).toBe(50);
    expect(Math.round(run5.filter(x => x).length / 100, 0)).toBe(75);
});

it("Provides consistent assignment when increasing weight", () => {
    const run2 = users.map(userId => showCanary(`${userId}.a`, 10));
    const run3 = users.map(userId => showCanary(`${userId}.a`, 25));
    const run4 = users.map(userId => showCanary(`${userId}.a`, 50));
    const run5 = users.map(userId => showCanary(`${userId}.a`, 75));

    expect(
        run2
            // this should filter out all results leaving an array of length 0
            .filter((show, i) => {
                // if a user was assigned to the canary in run2 they should remain in the canary in run3
                if (show) {
                    // run3[i] should still be true, so this should return false
                    return !run3[i];
                } else return false;
            }).length
    ).toBe(0);

    expect(
        run3.filter((show, i) => {
            if (show) {
                return !run4[i];
            } else return false;
        }).length
    ).toBe(0);

    expect(
        run4.filter((show, i) => {
            if (show) {
                return !run5[i];
            } else return false;
        }).length
    ).toBe(0);
});
