/**
 * PayVia Self-Checkout JavaScript SDK
 * Enables popup or inline modal checkout on any website.
 */
(function (window) {
  'use strict';

  var PayVia = {
    checkout: function (options) {
      if (!options || (!options.token && !options.payment_url)) {
        console.error('PayVia: token or payment_url is required');
        return;
      }

      var paymentUrl = options.payment_url || ('http://192.168.1.9:5173/pay/' + options.token);

      if (options.mode === 'redirect') {
        window.location.href = paymentUrl;
        return;
      }

      // Popup Mode
      var width = 440;
      var height = 680;
      var left = (window.screen.width - width) / 2;
      var top = (window.screen.height - height) / 2;

      var popup = window.open(
        paymentUrl,
        'PayViaCheckout',
        'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + ',scrollbars=yes,resizable=yes'
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Popup blocked fallback
        if (confirm('Popup was blocked. Continue to payment in a new tab?')) {
          window.open(paymentUrl, '_blank');
        }
        return;
      }

      // Message Listener for terminal states
      var messageListener = function (event) {
        if (event.data && event.data.source === 'payvia') {
          if (event.data.status === 'TXN_SUCCESS' && typeof options.onSuccess === 'function') {
            options.onSuccess(event.data);
            try { popup.close(); } catch (e) {}
            window.removeEventListener('message', messageListener);
          } else if (event.data.status === 'FAILED' && typeof options.onFailure === 'function') {
            options.onFailure(event.data);
            try { popup.close(); } catch (e) {}
            window.removeEventListener('message', messageListener);
          }
        }
      };

      window.addEventListener('message', messageListener);

      // Check popup close timer
      var checkClosedTimer = setInterval(function () {
        if (popup.closed) {
          clearInterval(checkClosedTimer);
          window.removeEventListener('message', messageListener);
          if (typeof options.onClose === 'function') {
            options.onClose();
          }
        }
      }, 1000);
    }
  };

  window.PayVia = PayVia;
})(window);
