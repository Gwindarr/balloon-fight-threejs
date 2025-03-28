# CLAUDE.md - ThreeJS Balloon Fight

## Run Commands
- **Run app**: Open `index.html` in a browser
- **Run multiplayer server**: `python server.py`
- **Python environment**:
  ```
  python -m venv venv
  source venv/bin/activate  # On Windows: venv\Scripts\activate
  pip install -r requirements.txt
  ```

## Code Style Guidelines
- **Imports**: Use ES modules. Group imports by core libs then project modules.
- **Formatting**: 2-space indentation, semicolons, no trailing commas.
- **Types**: Pure JavaScript with JSDoc-style comments for documentation.
- **Naming**:
  - camelCase for variables, functions, methods
  - PascalCase for classes
  - UPPER_CASE for constants
- **Error Handling**: Use console logs for errors, check objects exist before access.
- **Code Organization**: Keep code modular with separate files for different concerns.
  - Classes for game entities
  - Constants centralized in `constants.js`
  - Clean separation between game logic and rendering

No linting tools or test frameworks are currently used in this project.