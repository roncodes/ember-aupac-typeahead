import AupacTypeahead from './aupac-typeahead';
import { inject as service } from '@ember/service';
import { observer, computed } from '@ember/object';
import { typeOf, isNone } from '@ember/utils';
import jQuery from 'jquery';

export default AupacTypeahead.extend({

  modelClass : null, //@public
  displayKey : 'displayName', //@public
  params : {}, //@public
  async : true, //@public
  queryKey : 'q', //@public

  //private
  store : service('store'),

  /**
   * @Override
   */
  display : computed(function() {
    return (model) => {
      return model.get(get(this, 'displayKey'));
    };
  }),

  /**
   * @Override
   */
  setValue : function(selection) {
    if (get(this, '_typeahead')) { // Was failing in tests with this probably due to a stray observer
      selection = this.transformSelection(selection);
      if (typeof selection === 'string') {
        get(this, '_typeahead').typeahead('val', selection);
      } else {
        const displayKey = get(this, 'displayKey');
        const modelClass = get(this, 'modelClass');
        if(selection && selection.get('id')) {
          const item = get(this, 'store').peekRecord(modelClass, selection.get('id'));
          if (isNone(item)) {
            get(this, 'store').findRecord(modelClass, selection.get('id')).then((model) => {
              get(this, '_typeahead').typeahead('val', model.get(displayKey));
            });
          } else {
            get(this, '_typeahead').typeahead('val', item.get(displayKey));
          }
        } else {
          get(this, '_typeahead').typeahead('val', '');
        }
      }
    }
  },

  /**
   * @Override
   */
  _commitSelection: function() {
    const model = get(this, 'selection');

    if (get(this, 'allowFreeInput')) {
      const displayKey = get(this, 'displayKey');
      const displayValue = typeOf(model) === 'instance' ? model.get(displayKey) : undefined
      const value = get(this, '_typeahead').typeahead('val');

      if (displayValue !== value) {
        this.updateSelectionWhenChanged(value);
      }
    } else if (model) {
      this.setValue(model);
    } else {
      this.setValue(null);
    }
  },

  /**
   * @Override
   */
  init : function() {
    this._super(...arguments);

    if(isNone(get(this, 'modelClass'))) {
      throw new Error('modelClass must be supplied to aupac-typeahead');
    }
  },

  /**
   * @Override
   */
  source : computed(function() {
    const _this = this;
    return function (query, syncResults, asyncResults) {
      const q = {};
      q[_get(this, 'queryKey')] = query;
      const queryObj = jQuery.extend(true, {}, q , _get(this, 'params'));

      _get(this, 'store').query(_get(this, 'modelClass'), queryObj).then(function(models) {
        let emberDataModels = [];
        models.get('content').forEach(function(model, i) {
          emberDataModels[i] = model.getRecord();
        });
        asyncResults(emberDataModels);
      });
    };
  }),

  /**
   * @Override
   */
  selectionUpdated : observer('selection.id', '_typeahead', function() {
    const selection = get(this, 'selection');
    if(isNone(selection)) {
      this.setValue(null);
    } else {
      this.setValue(selection);
    }
  })

});
