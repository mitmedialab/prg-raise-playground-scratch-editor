import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {injectIntl, defineMessages} from 'react-intl';
import {connect} from 'react-redux';
import intlShape from '../lib/intlShape.js';
import {spriteShape} from '../lib/assets-prop-types.js';
import VM from '@scratch/scratch-vm';
import mergeDynamicAssets from '../lib/merge-dynamic-assets.js';
import doodlebotcostume1 from "!!raw-loader!../lib/default-project/doodlebotcostume1.svg";

import spriteLibraryContent from '../lib/libraries/sprites.json';
import randomizeSpritePosition from '../lib/randomize-sprite-position';
import spriteTags from '../lib/libraries/sprite-tags';

import LibraryComponent from '../components/library/library.jsx';

const messages = defineMessages({
    libraryTitle: {
        defaultMessage: 'Choose a Sprite',
        description: 'Heading for the sprite library',
        id: 'gui.spriteLibrary.chooseASprite'
    }
});

class SpriteLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect',
            'mergeDynamicAssets'
        ]);
        this.processedSprites = {};
        let _TextEncoder;
        if (typeof TextEncoder === "undefined") {
            _TextEncoder = require("text-encoding").TextEncoder;
        } else {
            /* global TextEncoder */
            _TextEncoder = TextEncoder;
        }
        const encoder = new _TextEncoder();

        spriteLibraryContent.push({
            name: "Doodlebot",
            tags: [
                "robot",
                "creativity",
            ],
            isStage: false,
            variables: {},
            costumes: [
                {
                    assetId: "b7853f557e4426412e64bb3da6531a99",
                    name: "doodlebotcostume1",
                    bitmapResolution: 1,
                    md5ext: `data:image/svg+xml;base64,${encoder
                        .encode(doodlebotcostume1)
                        .toBase64()}`,
                    dataFormat: "svg",
                    rotationCenterX: 128,
                    rotationCenterY: 145,
                },
            ],
            sounds: [
                {
                    assetId: "1727f65b5f22d151685b8e5917456a60",
                    name: "Robot Sound",
                    dataFormat: "wav",
                    format: "adpcm",
                    rate: 22050,
                    sampleCount: 8129,
                    md5ext: "1727f65b5f22d151685b8e5917456a60.wav",
                },
            ],
            blocks: {},
        });
        spriteLibraryContent.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
    }
    handleItemSelect (item) {
        // Randomize position of library sprite
        randomizeSpritePosition(item);
        this.props.vm.addSprite(JSON.stringify(item)).then(() => {
            this.props.onActivateBlocksTab();
        });
    }
    mergeDynamicAssets () {
        if (this.processedSprites.source === this.props.dynamicSprites) {
            return this.processedSprites.data;
        }
        this.processedSprites = mergeDynamicAssets(
            spriteLibraryContent,
            this.props.dynamicSprites
        );
        return this.processedSprites.data;
    }
    render () {
        const data = this.mergeDynamicAssets();
        return (
            <LibraryComponent
                data={data}
                id="spriteLibrary"
                tags={spriteTags}
                title={this.props.intl.formatMessage(messages.libraryTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

const mapStateToProps = state => ({
    dynamicSprites: state.scratchGui.dynamicAssets.sprites
});

SpriteLibrary.propTypes = {
    dynamicSprites: PropTypes.arrayOf(spriteShape),
    intl: intlShape.isRequired,
    onActivateBlocksTab: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(connect(mapStateToProps)(SpriteLibrary));
