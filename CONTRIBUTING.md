# Contributing to Arbitrage Bot System

Thank you for your interest in contributing to the Arbitrage Bot System! This document provides guidelines for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Git Flow](#git-flow)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/arb.git
   cd arb
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/arb.git
   ```
4. **Set up development environment**:
   ```bash
   bash scripts/dev-start.sh
   ```

## Development Workflow

We use **Git Flow** for our development workflow:

### Branches

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes
- `release/*` - Release preparation

### Creating a Feature Branch

```bash
# Update develop branch
git checkout develop
git pull upstream develop

# Create feature branch
git checkout -b feature/your-feature-name

# Work on your feature
# Commit changes (see commit message guidelines)

# Push to your fork
git push origin feature/your-feature-name
```

## Git Flow

### Branch Naming Convention

- `feature/add-authentication` - New features
- `bugfix/fix-odds-calculation` - Bug fixes
- `hotfix/critical-security-patch` - Hotfixes
- `release/v1.0.0` - Release branches

### Merging Strategy

- Feature → Develop: Create Pull Request
- Develop → Main: Via Release branch
- Hotfix → Main & Develop: Direct merge after review

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, semicolons, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks
- `ci` - CI/CD changes

### Examples

```bash
feat(engine): add WebSocket support for real-time updates

Implement WebSocket server for real-time communication between
engine and workers. Includes connection handling, authentication,
and message broadcasting.

Closes #123
```

```bash
fix(worker): correct odds conversion for Malaysian format

Fixed calculation error in convertToDecimal() that was producing
incorrect odds for Malaysian format negative values.

Fixes #456
```

```bash
docs(readme): update installation instructions

Added clarification about environment variable setup and
improved Docker compose startup documentation.
```

## Pull Request Process

1. **Update your branch** with latest develop:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout feature/your-feature
   git rebase develop
   ```

2. **Run tests** and ensure they pass:
   ```bash
   cd engine && npm test
   cd ../worker && pytest
   ```

3. **Update documentation** if needed

4. **Create Pull Request** with:
   - Clear title following commit message format
   - Detailed description of changes
   - Reference to related issues
   - Screenshots (if UI changes)
   - Test results

5. **Code Review**:
   - Address reviewer comments
   - Make requested changes
   - Push updates to your branch

6. **Merge**:
   - Squash commits if needed
   - Merge once approved

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

## Coding Standards

### Node.js (Engine)

- **Style Guide**: [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- **Linter**: ESLint
- **Formatter**: Prettier
- Use `async/await` over callbacks
- Use meaningful variable names
- Add JSDoc comments for functions
- Keep functions small and focused

```javascript
/**
 * Convert odds from various formats to decimal
 * @param {number} odds - Odds value to convert
 * @param {string} format - Source format (indo, malay, hk, american, decimal)
 * @returns {number} Decimal odds
 */
function convertToDecimal(odds, format) {
  // Implementation
}
```

### Python (Worker)

- **Style Guide**: [PEP 8](https://peps.python.org/pep-0008/)
- **Linter**: Pylint
- **Formatter**: Black
- Use type hints
- Add docstrings for classes and functions
- Follow snake_case naming

```python
def calculate_stake(
    total_stake: float,
    odds_a: float,
    odds_b: float
) -> tuple[float, float]:
    """
    Calculate stake distribution for arbitrage bet.
    
    Args:
        total_stake: Total amount to bet
        odds_a: Decimal odds for side A
        odds_b: Decimal odds for side B
    
    Returns:
        Tuple of (stake_a, stake_b)
    """
    # Implementation
```

### Database

- Use migrations for schema changes
- Add comments to complex queries
- Use prepared statements
- Index frequently queried columns

### Docker

- Keep Dockerfiles minimal
- Use multi-stage builds
- Don't run as root
- Pin image versions

## Testing

### Unit Tests

**Engine (Node.js)**:
```bash
cd engine
npm test
npm run test:coverage
```

**Worker (Python)**:
```bash
cd worker
pytest
pytest --cov=.
```

### Integration Tests

```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d

# Run tests
npm run test:integration

# Cleanup
docker compose -f docker-compose.test.yml down -v
```

### Test Coverage

- Aim for >80% code coverage
- Test edge cases
- Test error handling
- Mock external dependencies

## Documentation

- Update README.md for user-facing changes
- Update inline code comments
- Add/update API documentation
- Create/update architectural diagrams if needed

## Security

- **Never commit secrets** (.env, keys, passwords)
- **Report vulnerabilities** privately to maintainers
- **Follow security best practices**
- **Use environment variables** for configuration

## Questions?

- Open an issue for discussion
- Check existing issues and PRs
- Read project documentation

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

---

Thank you for contributing to make this project better! 🚀
