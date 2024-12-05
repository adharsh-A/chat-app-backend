import bcrypt from 'bcryptjs';

// Function to calculate Levenshtein distance
function levenshteinDistance(a, b) {
  const matrix = [];

  // Initialize the matrix
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Populate the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // Deletion
          matrix[i][j - 1] + 1, // Insertion
          matrix[i - 1][j - 1] + 1 // Substitution
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

// Function to calculate similarity as a percentage
function calculateSimilarity(a, b) {
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return ((maxLength - distance) / maxLength) * 100;
}

// Main function
async function passwordTest() {
  try {
    // Replace these with your actual values
    const rawPassword = 'Adharsh@princexf';
    const storedHash = '$2a$12$qSa.js6ZSD1qFUylCnu.4ubkuDZXyC6SmnrYOeDvX7fTheyjdHwlq';

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(rawPassword, storedHash);

    console.log('Password Verification Result:', isPasswordValid);

    // If the password is invalid, calculate similarity
    if (!isPasswordValid) {
      // For similarity, we can only compare the raw password with the hash base safely
      const hashBase = storedHash.slice(7, 7 + rawPassword.length); // Truncate hash for comparison
      const similarity = calculateSimilarity(rawPassword, hashBase);

      console.log(`Password Similarity: ${similarity.toFixed(2)}%`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

passwordTest();
