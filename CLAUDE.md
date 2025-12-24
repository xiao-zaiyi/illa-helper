# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **illa-helper**, a browser extension for immersive language learning based on the "i+1" comprehensible input theory. It intelligently replaces selected words with translations to create a natural language learning environment while browsing the web.

## Common Development Commands

### Development
```bash
npm run dev              # Start development server (Chrome)
npm run dev:firefox      # Start development server (Firefox)
```

### Building
```bash
npm run build            # Build for production (Chrome)
npm run build:firefox    # Build for production (Firefox)
npm run zip              # Create zip package (Chrome)
npm run zip:firefox      # Create zip package (Firefox)
npm run zip:all          # Create packages for all browsers
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix
npm run format           # Format code with Prettier
npm run check            # Run format + lint:fix
npm run compile          # TypeScript compilation check
```

### Release
```bash
npm run release          # Create release (runs release.js script)
```

## Architecture Overview

### Core Framework
- **Extension Framework**: WXT (WebExtension Toolkit)
- **Frontend**: Vue 3 + TypeScript + Vite
- **UI**: Tailwind CSS + Lucide Icons + Reka UI components
- **State Management**: Vue 3 Composition API with reactive storage
- **Internationalization**: Vue I18n with 5 language support

### Entry Points
- `entrypoints/background.ts` - Background service worker with service-oriented architecture
- `entrypoints/content.ts` - Content script for DOM manipulation and translation
- `entrypoints/popup/` - Popup interface for quick settings
- `entrypoints/options/` - Full settings interface with Vue components

### Module Architecture

#### Core Services (`src/modules/`)
- **Background Services**: `ApiProxyService`, `NotificationService`, `CommandService`, `InitializationService`
- **Content Services**: `ContentManager`, `ProcessingService`, `ConfigurationService`, `ListenerService`
- **Translation Services**: `ParagraphTranslationService`
- **Storage**: `src/modules/core/storage` (User settings & persistence)
- **API Layer**: `src/modules/api`
  - `services/`: Core API services (`UniversalApiService`)
  - `loadbalancer/`: Multi-key load balancing & failover logic (`ServiceDispatcher`, `FailoverExecutor`)
  - `providers/`: AI provider implementations (OpenAI, Gemini, etc.)
- **Translation**: `src/modules/core/translation` (Text processing & replacement logic)
- **UI Components**: `entrypoints/options/components`
- **Messaging**: Inter-component communication system

#### API Integration (`src/modules/api/`)
- **Factory Pattern**: `ApiServiceFactory` for provider abstraction
- **Providers**: `OpenAIProvider`, `GoogleGeminiProvider` with extensible architecture
- **Services**: `UniversalApiService` with intelligent retry and error handling
- **Support**: OpenAI-compatible APIs, Google Gemini, and custom endpoints

#### Pronunciation System (`src/modules/pronunciation/`)
- **Factory Pattern**: `PhoneticProviderFactory`, `TTSProviderFactory`
- **Providers**: Dictionary API, Youdao TTS, Web Speech API
- **Services**: `PronunciationService`, `TTSService` with caching
- **UI**: Interactive tooltips with phonetic display and audio playback

#### Processing Pipeline (`src/modules/processing/`)
- **Content Segmentation**: `ContentSegmenter` for intelligent text grouping
- **Processing Coordinator**: `ProcessingCoordinator` for workflow management
- **State Management**: `ProcessingStateManager` for tracking translation state

### Key Features

#### Translation Engine
- AI-powered intelligent vocabulary selection based on user proficiency level
- Smart language detection (20+ languages supported)
- Precise translation ratio control (1%-100%)
- Context-aware vocabulary selection
- Lazy loading for performance optimization

#### Pronunciation Ecosystem
- Interactive tooltips with phonetics, AI definitions, and TTS
- Dual TTS support (Youdao + Web Speech API)
- Smart caching for phonetic data and audio
- British/American pronunciation switching
- Progressive loading with nested tooltip support

#### Configuration System
- Multi-API configuration with flexible switching
- User level adaptation (5 levels from beginner to advanced)
- Website blacklist/whitelist management
- Import/export configuration functionality
- Cross-browser storage synchronization

## Development Guidelines

### Code Style
- **TypeScript**: Strict mode enabled, comprehensive type definitions
- **ESLint**: Custom configuration with Vue support and Prettier integration
- **Prettier**: Consistent formatting with 2-space indentation
- **Vue**: Composition API, single-file components with proper TypeScript

### Key Patterns
- **Service Architecture**: Singleton services with clear responsibility separation
- **Factory Pattern**: For extensible provider systems (API, TTS, Phonetic)
- **Event-Driven**: Messaging system for inter-component communication
- **Modular Design**: Feature-based module organization
- **Caching Strategy**: Multi-level caching for performance optimization

### Browser Compatibility
- **Primary**: Chrome, Edge (full support)
- **Secondary**: Firefox (requires special configuration)
- **Limited**: Safari (additional setup required)
- **Storage**: Firefox requires explicit addon ID in manifest

### Environment Configuration
- Copy `.env.example` to `.env` for local development
- Minimum required: `VITE_WXT_DEFAULT_API_KEY`
- Optional: Custom API endpoint, model, temperature settings
- Environment variables are injected at build time

### Performance Considerations
- **DOM Safety**: Use Range API for text replacement to maintain structure integrity
- **Memory Management**: Proper cleanup of listeners and cached data
- **Incremental Processing**: Only process new content, avoid duplicate operations
- **Lazy Loading**: On-demand translation when scrolling
- **Debouncing**: Smart delayed processing for dynamic content

## Testing and Debugging

### Extension Testing
- Use browser developer tools for debugging
- Background script: Service worker debugging in extensions page
- Content script: Regular browser devtools on target pages
- Popup/Options: Vue devtools integration

### Common Issues
- **Firefox Storage**: Ensure proper addon ID configuration
- **API Configuration**: Verify API keys and endpoints in `.env`
- **Content Script**: Check website permissions and blacklist status
- **Performance**: Monitor memory usage and DOM mutation frequency

## Build and Deployment

### Multi-Browser Support
- Chrome: `npm run build && npm run zip`
- Firefox: `npm run build:firefox && npm run zip:firefox`
- Safari: Additional packaging required (see docs)

### Release Process
1. Update version in `package.json`
2. Run `npm run release` (executes `scripts/release.js`)
3. Upload to respective browser stores
4. Update documentation and version notes

## Important Notes

- **Security**: Never commit API keys or sensitive configuration
- **Internationalization**: All UI text must support i18n
- **Accessibility**: Ensure ARIA compliance for UI components
- **Performance**: Profile memory usage and optimize hot paths
- **Browser APIs**: Use WebExtension APIs with fallbacks for compatibility