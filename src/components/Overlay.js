import React from 'react';
import PropTypes from 'prop-types';
import treeChanges from 'tree-changes';

import {
  getClientRect,
  getDocumentHeight,
  getElement,
  getElementPosition,
  getScrollParent,
  hasCustomScrollParent,
  isFixed,
} from '../modules/dom';
import { isLegacy } from '../modules/helpers';

import LIFECYCLE from '../constants/lifecycle';

import Spotlight from './Spotlight';

let unregisterOptimizedResize;
let unregisterOptimizedScroll;

(() => {
  const throttle = (type, name, obj = window) => {
    let running = false;
    const func = () => {
      if (running) {
        return;
      }
      running = true;
      requestAnimationFrame(() => {
        obj.dispatchEvent(new CustomEvent(name));
        running = false;
      });
    };
    obj.addEventListener(type, func);
    return () => {
      obj.removeEventListener(type, func);
    };
  };

  // IE 11: you'll need the CustomEvent polyfill
  unregisterOptimizedResize = throttle('resize', 'optimizedResize');
  unregisterOptimizedScroll = throttle('scroll', 'optimizedScroll');
})();

export default class Overlay extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      mouseOverSpotlight: false,
      isScrolling: false,
      showSpotlight: props.disableScrolling,
    };
  }

  static propTypes = {
    disableOverlay: PropTypes.bool.isRequired,
    disableScrolling: PropTypes.bool.isRequired,
    lifecycle: PropTypes.string.isRequired,
    onClickOverlay: PropTypes.func.isRequired,
    placement: PropTypes.string.isRequired,
    spotlightClicks: PropTypes.bool.isRequired,
    spotlightPadding: PropTypes.number,
    styles: PropTypes.object.isRequired,
    target: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
  };

  componentDidMount() {
    const { disableScrolling, target } = this.props;

    if (!disableScrolling) {
      const element = getElement(target);
      this.scrollParent = hasCustomScrollParent(element) ? getScrollParent(element) : document;
    }

    window.addEventListener('optimizedResize', this.handleResize);
    window.addEventListener('optimizedScroll', this.handleScroll);
  }

  componentWillReceiveProps(nextProps) {
    const { disableScrolling, lifecycle, spotlightClicks } = nextProps;
    const { changed, changedTo } = treeChanges(this.props, nextProps);

    if (!disableScrolling) {
      if (changedTo('lifecycle', LIFECYCLE.TOOLTIP)) {
        this.scrollParent.addEventListener('scroll', this.handleScroll, { passive: true });

        setTimeout(() => {
          if (!this.state.isScrolling) {
            this.setState({ showSpotlight: true });
            this.scrollParent.removeEventListener('scroll', this.handleScroll);
          }
        }, 100);
      }
    }

    if (changed('spotlightClicks') || changed('disableOverlay') || changed('lifecycle')) {
      if (spotlightClicks && lifecycle === LIFECYCLE.TOOLTIP) {
        document.addEventListener('mousemove', this.handleMouseMove, false);
      }
      else if (lifecycle !== LIFECYCLE.TOOLTIP) {
        document.removeEventListener('mousemove', this.handleMouseMove);
      }
    }
  }

  componentWillUnmount() {
    const { disableScrolling } = this.props;

    document.removeEventListener('mousemove', this.handleMouseMove);

    if (!disableScrolling) {
      clearTimeout(this.scrollTimeout);
      this.scrollParent.removeEventListener('scroll', this.handleScroll);
    }

    window.removeEventListener('optimizedResize', this.handleResize);
    window.removeEventListener('optimizedScroll', this.handleScroll);

    unregisterOptimizedResize();
    unregisterOptimizedScroll();
  }

  handleMouseMove = e => {
    const { mouseOverSpotlight } = this.state;
    const { height, left, position, top, width } = this.stylesSpotlight;

    const offsetY = position === 'fixed' ? e.clientY : e.pageY;
    const offsetX = position === 'fixed' ? e.clientX : e.pageX;
    const inSpotlightHeight = offsetY >= top && offsetY <= top + height;
    const inSpotlightWidth = offsetX >= left && offsetX <= left + width;
    const inSpotlight = inSpotlightWidth && inSpotlightHeight;

    if (inSpotlight !== mouseOverSpotlight) {
      this.setState({ mouseOverSpotlight: inSpotlight });
    }
  };

  handleScroll = () => {
    if (!this.state.isScrolling) {
      this.setState({ isScrolling: true, showSpotlight: false });
    }
    clearTimeout(this.scrollTimeout);

    this.scrollTimeout = setTimeout(() => {
      clearTimeout(this.scrollTimeout);
      this.setState({ isScrolling: false, showSpotlight: true });
      this.scrollParent.removeEventListener('scroll', this.handleScroll);
    }, 50);
  };

  handleResize = () => {
    this.forceUpdate();
  };

  handleScroll = () => {
    this.forceUpdate();
  };

  get stylesSpotlight() {
    const { showSpotlight } = this.state;
    const { spotlightClicks, spotlightPadding, styles, target } = this.props;
    const element = getElement(target);
    const elementRect = getClientRect(element);
    const isFixedTarget = isFixed(element);
    const top = getElementPosition(element, spotlightPadding);

    return {
      ...(isLegacy() ? styles.spotlightLegacy : styles.spotlight),
      height: Math.round(elementRect.height + spotlightPadding * 2),
      left: Math.round(elementRect.left - spotlightPadding),
      opacity: showSpotlight ? 1 : 0,
      pointerEvents: spotlightClicks ? 'none' : 'auto',
      position: isFixedTarget ? 'fixed' : 'absolute',
      top,
      transition: 'opacity 0.2s',
      width: Math.round(elementRect.width + spotlightPadding * 2),
    };
  }

  render() {
    const { showSpotlight } = this.state;
    const { disableOverlay, lifecycle, onClickOverlay, placement, styles } = this.props;

    if (disableOverlay || lifecycle !== LIFECYCLE.TOOLTIP) {
      return null;
    }

    const stylesOverlay = {
      cursor: disableOverlay ? 'default' : 'pointer',
      height: getDocumentHeight(),
      pointerEvents: this.state.mouseOverSpotlight ? 'none' : 'auto',
      ...(isLegacy() ? styles.overlayLegacy : styles.overlay),
    };

    return (
      <div className="joyride-overlay" style={stylesOverlay} onClick={onClickOverlay}>
        {placement !== 'center' && showSpotlight && <Spotlight styles={this.stylesSpotlight} />}
      </div>
    );
  }
}
