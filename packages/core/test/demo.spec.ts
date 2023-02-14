function sumTwoNumbers(a: number, b: number): number {
  return a + b;
}

describe('sumTwoNumbers', () => {
  it('should add two numbers', () => {

    // Arrange
    const n1 = 1;
    const n2 = 2;

    // Act
    const result = sumTwoNumbers(n1, n2);
    
    // Assert
    expect(result).toBe(3);
  });
});