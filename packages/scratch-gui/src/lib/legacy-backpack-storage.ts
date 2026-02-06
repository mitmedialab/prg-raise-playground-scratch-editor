import xhr from 'xhr';
import {ScratchStorage, Asset} from 'scratch-storage';
import {
    GUIBackpackStorage,
    BackpackListItemsInput,
    BackpackSaveItemInput,
    BackpackDeleteItemInput,
    BackpackItem,
    SerializableData
} from '../gui-config';

type BackpackItemWithoutUrls = Omit<BackpackItem, 'thumbnailUrl' | 'bodyUrl'>;

// Add a new property for the full thumbnail url, which includes the host.
// Also include a full body url for loading sprite zips
// TODO retreiving the images through storage would allow us to remove this.
const includeFullUrls = (item: BackpackItemWithoutUrls, host: string): BackpackItem => ({
    ...item,
    thumbnailUrl: `${host}/${item.thumbnail}`,
    bodyUrl: `${host}/${item.body}`
});

export class LegacyBackpackStorage implements GUIBackpackStorage {
    private host?: string;
    private webStoreRegistered = false;

    constructor(
        private tokenHeader: 'x-token' | 'authorization'
    ) {}

    // TODO: This is unsafe to call multiple times. It's fine in our usages for now, but should
    //       maybe be updated to remove the old webStore setting before adding the new one
    setHostAndRegisterWebStore(host: string, scratchStorage: ScratchStorage): void {
        this.host = host;

        if (!this.webStoreRegistered) {
            const AssetType = scratchStorage.AssetType;
            scratchStorage.addWebStore(
                [AssetType.ImageVector, AssetType.ImageBitmap, AssetType.Sound],
                this.getBackpackAssetURL.bind(this)
            );
            this.webStoreRegistered = true;
        }
    }

    list(request: BackpackListItemsInput): Promise<BackpackItem[]> {
        const host = this.host;
        if (!host) {
            return Promise.reject(new Error('Backpack host not set'));
        }

        return new Promise((resolve, reject) => {
            xhr({
                method: 'GET',
                uri: `${host}/${request.username}?limit=${request.limit}&offset=${request.offset}`,
                headers: this.tokenHeader === 'x-token' ?
                    {'x-token': request.token} :
                    {Authorization: `Bearer ${request.token}`},
                json: true
            }, (error, response) => {
                if (error || response.statusCode !== 200) {
                    return reject(new Error(String(response.statusCode)));
                }
                const items = response.body as BackpackItemWithoutUrls[];
                return resolve(items.map(item => includeFullUrls(item, host)));
            });
        });
    }

    save(item: BackpackSaveItemInput, data: SerializableData): Promise<BackpackItem> {
        const host = this.host;
        if (!host) {
            return Promise.reject(new Error('Backpack host not set'));
        }

        return Promise.all([
            data.dataAsBase64(),
            data.thumbnailAsBase64()
        ]).then(([body, thumbnail]) => {
            return new Promise<BackpackItem>((resolve, reject) => {
                xhr({
                    method: 'POST',
                    uri: `${host}/${item.username}`,
                    headers: this.tokenHeader === 'x-token' ?
                        {'x-token': item.token} :
                        {Authorization: `Bearer ${item.token}`},
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the type of the json param is wrong here
                    json: {
                        type: item.type,
                        mime: data.mimeType(),
                        name: item.name,

                        body,
                        thumbnail
                    } as any
                }, (error, response) => {
                    if (error || response.statusCode !== 200) {
                        return reject(new Error(String(response.statusCode)));
                    }
                    return resolve(includeFullUrls(response.body as BackpackItemWithoutUrls, host));
                });
            });
        });
    }

    delete(item: BackpackDeleteItemInput): Promise<void> {
        const host = this.host;
        if (!host) {
            return Promise.reject(new Error('Backpack host not set'));
        }

        return new Promise((resolve, reject) => {
            xhr({
                method: 'DELETE',
                uri: `${host}/${item.username}/${item.id}`,
                headers: this.tokenHeader === 'x-token' ?
                    {'x-token': item.token} :
                    {Authorization: `Bearer ${item.token}`}
            }, (error, response) => {
                if (error || response.statusCode !== 200) {
                    return reject(new Error(String(response.statusCode)));
                }
                return resolve();
            });
        });
    }

    private getBackpackAssetURL(asset: Asset): string {
        return `${this.host}/${asset.assetId}.${asset.dataFormat}`;
    }
}
