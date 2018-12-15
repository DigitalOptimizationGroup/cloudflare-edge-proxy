import assignment from "../src/assign-uniform";

const users = [
    "user-1",
    "user-2",
    "user-3",
    "user-4",
    "user-5",
    "user-6",
    "user-7",
    "user-8",
    "user-9"
];

it("Consistently makes same assignment for same salt & number of items", () => {
    const firstRun = users.map(userId => assignment(`${userId}.a`, 5));
    const secondRun = users.map(userId => assignment(`${userId}.a`, 5));

    expect(firstRun).toEqual(secondRun);
});

it("Provides independent assignments for different salts with the same number of items", () => {
    const firstRun = users.map(userId => assignment(`${userId}.a`, 2));
    const secondRun = users.map(userId => assignment(`${userId}.b`, 2));

    expect(firstRun).not.toEqual(secondRun);
});
